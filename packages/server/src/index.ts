import { HttpLayerRouter } from "@effect/platform";
import { BunHttpServer } from "@effect/platform-bun";
import { Config, Effect, Layer } from "effect";
import { BussyConfig } from "./config";
import { BussyApiLive } from "./api";
import { ResourcesLive } from "./resources";

const serverLayer = HttpLayerRouter.serve(BussyApiLive).pipe(
  Layer.provide(ResourcesLive)
);

const program = Effect.gen(function* () {
  yield* Effect.logInfo("Starting Bussy Server...");

  const port = yield* Config.integer("PORT").pipe(Config.withDefault(3000));
  const host = yield* Config.string("LISTEN_ADDR").pipe(Config.withDefault("127.0.0.1"));

  yield* Effect.logInfo(`Starting HTTP server on ${host}:${port}`);

  const HttpLive = serverLayer.pipe(
    Layer.provide(
      BunHttpServer.layer({
        listen: host,
        port,
      }),
    ),
  );

  return yield* Layer.launch(HttpLive);
}).pipe(Effect.withConfigProvider(BussyConfig));

Effect.runPromise(program).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
