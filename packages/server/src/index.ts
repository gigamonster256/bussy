import { HttpServer } from "@effect/platform"
import { BunHttpServer } from "@effect/platform-bun"
import { Config, Context, Effect, Layer } from "effect"
import { DatabaseService } from "./drizzle"
import { AggieSpiritApi } from "./services/AggieSpiritApi"
import { MetadataCache } from "./services/MetadataCache"
import { NameResolver } from "./services/NameResolver"
import { WebPushService } from "./services/WebPushService"
import { apiRouter } from "./routes"

// Re-export route modules for testing
export * from "./routes"

/**
 * The HTTP router as an Effect.
 * Uses the composed apiRouter from route modules.
 */
export const HttpApp = Effect.succeed(apiRouter)

// ============================================================================
// Server Layer - Binds to network and serves HttpApp
// ============================================================================

/**
 * Service tag for the server configuration
 */
export class ServerConfig extends Context.Tag("ServerConfig")<
  ServerConfig,
  { readonly port: number; readonly host: string }
>() {}

/**
 * Default server config from environment
 */
export const ServerConfigLive = Layer.effect(
  ServerConfig,
  Effect.gen(function*() {
    const port = yield* Config.integer("PORT").pipe(Config.withDefault(3000))
    const host = yield* Config.string("LISTEN_ADDR").pipe(Config.withDefault("127.0.0.1"))
    return { port, host }
  })
)

/**
 * Creates a server config layer with specific values (useful for testing)
 */
export const makeServerConfig = (port: number, host = "127.0.0.1") => Layer.succeed(ServerConfig, { port, host })

/**
 * The live server that binds to a port and serves HTTP requests.
 * Requires all service dependencies to be provided.
 */
export const ServerLive = Effect.gen(function*() {
  const { host, port } = yield* ServerConfig
  const router = yield* HttpApp

  yield* Effect.logInfo(`Starting HTTP server on ${host}:${port}`)

  const serverLayer = HttpServer.serve(router)

  const HttpLive = serverLayer.pipe(
    Layer.provide(BunHttpServer.layer({
      listen: host,
      port
    }))
  )

  return yield* Layer.launch(HttpLive)
})

/**
 * Dependencies required by the HTTP router
 */
export type HttpAppDependencies = AggieSpiritApi | MetadataCache | DatabaseService | WebPushService | NameResolver
