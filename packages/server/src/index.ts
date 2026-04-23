import { HttpLayerRouter } from "@effect/platform";
import { BunHttpServer } from "@effect/platform-bun";
import { Config, Context, Effect, Layer } from "effect";
import { BussyConfig } from "./config";
import { DatabaseLive } from "./drizzle";
import { BussyApiLive } from "./api";
import { Resources } from "./resources";

export class ServerConfig extends Context.Tag("ServerConfig")<
  ServerConfig,
  { readonly port: number; readonly host: string }
>() {}

export const ServerConfigLive = Layer.effect(
  ServerConfig,
  Effect.gen(function* () {
    const port = yield* Config.integer("PORT").pipe(Config.withDefault(3000));
    const host = yield* Config.string("LISTEN_ADDR").pipe(Config.withDefault("127.0.0.1"));
    return { port, host };
  }),
);

export const makeServerConfig = (port: number, host = "127.0.0.1") =>
  Layer.succeed(ServerConfig, { port, host });

export const ServerLive = Effect.gen(function* () {
  const { host, port } = yield* ServerConfig;

  yield* Effect.logInfo(`Starting HTTP server on ${host}:${port}`);

  const serverLayer = HttpLayerRouter.serve(BussyApiLive);

  const HttpLive = serverLayer.pipe(
    Layer.provide(
      BunHttpServer.layer({
        listen: host,
        port,
      }),
    ),
  );

  return yield* Layer.launch(HttpLive);
});

export type HttpAppDependencies = AggieSpiritApi | DatabaseService;

const ResourcesLive = Resources.pipe(Layer.provide(DatabaseLive));

const MainLayer = Layer.mergeAll(ServerConfigLive, AggieSpiritApi.Default, ResourcesLive);

const program = Effect.gen(function* () {
  yield* Effect.logInfo("Starting Bussy Server...");
  return yield* ServerLive;
}).pipe(Effect.withConfigProvider(BussyConfig));

Effect.runPromise(program).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
