import { Effect, Layer } from "effect";
import { Config } from "./config";
import { DatabaseLive } from "./drizzle";
import { ServerConfigLive, ServerLive } from ".";
import { AggieSpiritApi } from "./aggie-api/AggieSpiritApi";
import { Resources } from "./resources";
// import { MetadataCache } from "./services/MetadataCache"
// import { NameResolver } from "./services/NameResolver"
// import { PushNotificationOrchestrator } from "./services/PushNotificationOrchestrator"
// import { WebPushService } from "./services/WebPushService"

const ResourcesLive = Resources.pipe(Layer.provide(DatabaseLive));
// Layer.provide(MetadataCache.Default),

// Compose the application layer with all production dependencies
const MainLayer = Layer.mergeAll(
  ServerConfigLive,
  AggieSpiritApi.Default,
  // MetadataCache.Default,
  // NameResolver.Default,
  // PushNotificationOrchestrator.Default,
  ResourcesLive,
  // WebPushService.Default
);

const program = Effect.gen(function* () {
  yield* Effect.logInfo("Starting Bussy Server...");
  return yield* ServerLive;
}).pipe(Effect.provide(MainLayer), Effect.withConfigProvider(Config));

Effect.runPromise(program).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
