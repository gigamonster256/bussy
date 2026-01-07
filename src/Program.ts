import { Effect, Layer } from "effect"
import { Config } from "./config.js"
import { ServerLive } from "./server/index.js"
import { AggieSpiritApi } from "./services/AggieSpiritApi.js"
import { MetadataCache } from "./services/MetadataCache.js"
import { NotificationService } from "./services/NotificationService.js"
import { PollingOrchestrator } from "./services/PollingOrchestrator.js"
import { SubscriptionStore } from "./services/SubscriptionStore.js"
import { TracingLayer } from "./services/Tracing.js"

// Compose the application layer
const MainLayer = Layer.mergeAll(
  TracingLayer,
  AggieSpiritApi.Default,
  MetadataCache.Default,
  SubscriptionStore.Default,
  NotificationService.Default,
  PollingOrchestrator.Default
)

const program = Effect.gen(function*() {
  yield* Effect.logInfo("Starting Bus Notifier Server...")
  return yield* ServerLive
}).pipe(
  Effect.provide(MainLayer),
  Effect.withConfigProvider(Config)
)

Effect.runPromise(program).catch((e) => {
  console.error(e)
  process.exitCode = 1
})
