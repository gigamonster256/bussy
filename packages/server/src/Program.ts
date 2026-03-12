import { Effect, Layer } from "effect"
import { Config } from "./config"
import { DatabaseService } from "./db"
import { ServerConfigLive, ServerLive } from "."
import { AggieSpiritApi } from "./services/AggieSpiritApi"
import { MetadataCache } from "./services/MetadataCache"
import { NameResolver } from "./services/NameResolver"
import { PushNotificationOrchestrator } from "./services/PushNotificationOrchestrator"
import { WebPushService } from "./services/WebPushService"

// Compose the application layer with all production dependencies
const MainLayer = Layer.mergeAll(
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
