import { Effect, Layer } from "effect"
import { Config } from "./config.ts"
import { DatabaseService } from "./db/index.ts"
import { ServerConfigLive, ServerLive } from "./server/index.ts"
import { AggieSpiritApi } from "./services/AggieSpiritApi.ts"
import { MetadataCache } from "./services/MetadataCache.ts"
import { NameResolver } from "./services/NameResolver.ts"
import { PushNotificationOrchestrator } from "./services/PushNotificationOrchestrator.ts"
import { TracingLayer } from "./services/Tracing.ts"
import { WebPushService } from "./services/WebPushService.ts"

// Compose the application layer with all production dependencies
const MainLayer = Layer.mergeAll(
  TracingLayer,
  ServerConfigLive,
  AggieSpiritApi.Default,
  MetadataCache.Default,
  NameResolver.Default,
  PushNotificationOrchestrator.Default,
  DatabaseService.Default,
  WebPushService.Default
)

const program = Effect.gen(function*() {
  yield* Effect.logInfo("Starting Bussy Server...")
  return yield* ServerLive
}).pipe(
  Effect.provide(MainLayer),
  Effect.withConfigProvider(Config)
)

Effect.runPromise(program).catch((e) => {
  console.error(e)
  process.exitCode = 1
})
