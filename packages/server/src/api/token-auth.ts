import { HttpApiError } from "@effect/platform";
import { Layer, Effect, Redacted } from "effect";
import { DeviceService } from "../device";
import { TokenAuthorization } from "@bussy/api";

export const TokenAuthorizationLive = Layer.effect(
  TokenAuthorization,
  Effect.gen(function* () {
    const devices = yield* DeviceService;

    return {
      tokenBearer: (bearerToken) =>
        Effect.gen(function* () {
          yield* Effect.log("checking bearer token", Redacted.value(bearerToken));

          const device = yield* devices
            .getByToken(Redacted.value(bearerToken))
            .pipe(Effect.mapError(() => new HttpApiError.Unauthorized()));

          return device;
        }),
    };
  }),
);
