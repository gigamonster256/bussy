import { Config, Context, Duration, Effect, Layer } from "effect"
import { createHash } from "node:crypto"
import type { OutgoingHttpHeaders } from "node:http"

const extractRequestVerificationToken = (html: string) =>
  Effect.try(() => {
    // Matches a quoted base64 token string appearing in the page markup
    const match = /[a-zA-Z0-9]{288}MQ==/.exec(html)
    if (match === null) throw new Error("Could not find verification token")
    if (match.length > 1) throw new Error("Multiple verification tokens found")
    return Buffer.from(match[0], "base64").toString("utf8")
  })

const parseCookieHeader = (setCookieHeader: string): string => {
  // Aggie site returns multiple Set-Cookie values; join cookie pairs into a single Cookie header
  const parts = setCookieHeader.split(", ")
  let cookie = ""
  for (const c of parts) {
    const part = c.split(";")[0]
    if (part) cookie += part + "; "
  }
  return cookie
}

const annotateAuthToken = (headers: OutgoingHttpHeaders) =>
  Effect.gen(function*() {
    const tokenHash = yield* Effect.try(() => {
      const token = headers["RequestVerificationToken"]
      if (!token) throw new Error("No RequestVerificationToken header found")
      const tokenHash = createHash("sha256").update(String(token)).digest("hex")
      return tokenHash
    })

    yield* Effect.annotateCurrentSpan("tokenHash", tokenHash)
  })

const AggieSpiritAuthRaw = {
  headers: Effect.fn("AggieSpiritAuthRaw.getAuthenticationHeaders")(function*() {
    const res = yield* Effect.promise(() => fetch("https://aggiespirit.ts.tamu.edu", { credentials: "omit" }))
      .pipe(Effect.withSpan("fetchAggieSpiritHomePage"))

    const cookieHeader = res.headers.get("set-cookie")
    if (!cookieHeader) return yield* Effect.die(new Error("No set-cookie header found"))
    const Cookie = parseCookieHeader(cookieHeader)
    const token = yield* Effect.Do.pipe(
      Effect.bind("html", () => Effect.promise(() => res.text())),
      Effect.bind("token", ({ html }) => extractRequestVerificationToken(html)),
      Effect.map(({ token }) => token),
      Effect.withSpan("extractRequestVerificationToken")
    )
    const headers = {
      Cookie,
      RequestVerificationToken: token,
      "X-Requested-With": "XMLHttpRequest"
    }
    yield* annotateAuthToken(headers)
    return headers
  })
}

const AggieSpiritAuthCached = Effect.gen(function*() {
  const base = yield* AggieSpiritAuth
  const headers = yield* Effect.cachedWithTTL(
    base.headers(),
    yield* Config.duration("API_AUTH_CACHE_TTL").pipe(Config.withDefault(Duration.hours(6)))
  )
  return {
    headers: Effect.fn("AggieSpiritAuth.getAuthenticationHeaders")(function*() {
      return yield* headers
    })
  }
})

export class AggieSpiritAuth extends Context.Tag("AggieSpiritAuth")<
  AggieSpiritAuth,
  typeof AggieSpiritAuthRaw // use base implementation for type inference - good?
>() {
  static Raw = Layer.succeed(this, AggieSpiritAuthRaw)
  static DefaultWithoutDependencies = Layer.effect(this, AggieSpiritAuthCached)
  static Default = this.DefaultWithoutDependencies.pipe(Layer.provide(this.Raw))
  // static Mock = AggieSpiritAuthMock
}
