import { Config, Effect } from "effect";
import { HttpApiBuilder } from "@effect/platform";
import { BussyApi, CurrentDevice } from "@bussy/api";

export const HttpHealthLive = HttpApiBuilder.group(BussyApi, "health", (handlers) =>
  Effect.gen(function* () {
    const publicKey = yield* Config.string("VAPID_PUBLIC_KEY");

    return handlers
      .handle(
        "health",
        Effect.fn("HttpHealthLive.health")(function* () {
          return yield* Effect.succeed("ok");
        }),
      )
      .handle(
        "secure",
        Effect.fn("HttpHealthLive.secure")(function* () {
          const device = yield* CurrentDevice;
          return `secure ok for device ${device.id}`;
        }),
      )
      .handle("getVapidPublicKey", () => Effect.succeed({ publicKey }));
  }),
);
