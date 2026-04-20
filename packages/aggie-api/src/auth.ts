import { Config, Context, Data, Duration, Effect, Layer } from "effect";

// TODO: should auth be in the server package instead of the API?

const DEFAULT_BASE_URL = "https://aggiespirit.ts.tamu.edu";

export class MissingTokenError extends Data.TaggedError("MissingTokenError") {}

const extractRequestVerificationToken = Effect.fn("extractRequestVerificationToken")(function* (
  html: string,
) {
  // Matches a quoted base64 token string appearing in the page markup
  const match = /[a-zA-Z0-9]{288}MQ==/.exec(html);
  if (match === null) return yield* new MissingTokenError();
  return Buffer.from(match[0], "base64").toString("utf8");
});

// FIXME: there should be a more elegant way to reuse cookies
const parseCookieHeader = (setCookieHeader: string): string => {
  // Aggie site returns multiple Set-Cookie values; join cookie pairs into a single Cookie header
  const parts = setCookieHeader.split(", ");
  let cookie = "";
  for (const c of parts) {
    const part = c.split(";")[0];
    if (part) cookie += part + "; ";
  }
  return cookie;
};

const AggieSpiritAuthRaw = {
  headers: Effect.fn("AggieSpiritAuthRaw.getAuthenticationHeaders")(function* () {
    const baseUrl = yield* Config.string("AGGIE_SPIRIT_BASE_URL").pipe(
      Config.withDefault(DEFAULT_BASE_URL),
    );

    // TODO: effectify?
    const res = yield* Effect.promise(() => fetch(baseUrl, { credentials: "omit" }));

    const cookieHeader = res.headers.get("set-cookie");
    if (!cookieHeader) return yield* Effect.die(new Error("No set-cookie header found"));
    const Cookie = parseCookieHeader(cookieHeader);

    const html = yield* Effect.promise(() => res.text());
    const token = yield* extractRequestVerificationToken(html);

    const headers = {
      Cookie,
      RequestVerificationToken: token,
      "X-Requested-With": "XMLHttpRequest",
    };
    return headers;
  }),
};

const AggieSpiritAuthCached = Effect.gen(function* () {
  const base = yield* AggieSpiritAuth;

  const cacheTTL = yield* Config.duration("API_AUTH_CACHE_TTL").pipe(
    Config.withDefault(Duration.hours(6)),
  );

  const headers = yield* Effect.cachedWithTTL(base.headers(), cacheTTL);

  return {
    headers: Effect.fn("AggieSpiritAuth.getAuthenticationHeaders")(function* () {
      return yield* headers;
    }),
  };
});

export class AggieSpiritAuth extends Context.Tag("AggieSpiritAuth")<
  AggieSpiritAuth,
  typeof AggieSpiritAuthRaw // use base implementation for type inference - good?
>() {
  static Raw = Layer.succeed(this, AggieSpiritAuthRaw);
  static DefaultWithoutDependencies = Layer.effect(this, AggieSpiritAuthCached);
  // lets get it working before caching
  static Default = this.Raw;
  // static Default = this.DefaultWithoutDependencies.pipe(Layer.provide(this.Raw));
}
