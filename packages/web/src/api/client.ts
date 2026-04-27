import { FetchHttpClient, HttpApiClient } from "@effect/platform";
import { Effect, Layer, Data } from "effect";
import { BussyApi } from "@bussy/api";
import type { SubscriptionCreationParamsType } from "@bussy/api";

const BASE_URL = "http://localhost:3000";

export class NoDeviceToken extends Data.TaggedError("NoDeviceToken") {}

const clientBase = HttpApiClient.make(BussyApi, {
  baseUrl: BASE_URL,
});

const getAuthToken = Effect.fn(function* () {
  const token = localStorage.getItem("bussy-device-token");
  return token ? token : yield* new NoDeviceToken();
});

const registerDevice = Effect.fn(function* () {
  const bootstrapClient = yield* clientBase.pipe(Effect.provide(FetchHttpClient.layer));
  const result = yield* bootstrapClient.device.create();
  localStorage.setItem("bussy-device-id", result.id);
  localStorage.setItem("bussy-device-token", result.token);
  return result.token;
});

const ApiRequestInit = Layer.effect(
  FetchHttpClient.RequestInit,
  Effect.gen(function* () {
    const token = yield* getAuthToken().pipe(
      Effect.catchTag("NoDeviceToken", () => registerDevice()),
    );
    return { headers: { Authorization: `Bearer ${token}` } };
  }),
);

const FetchWithAuth = FetchHttpClient.layer.pipe(Layer.provide(ApiRequestInit));

const makeClient = () => {
  return clientBase.pipe(Effect.provide(FetchWithAuth));
};

async function makeRequest<R>(fn: (client: any) => Effect.Effect<R, any, never>): Promise<R> {
  const client = makeClient();
  return Effect.runPromise(client.pipe(Effect.flatMap(fn)));
}

export const api = {
  registerDevice: async () => {
    const client = makeClient();
    const result = await Effect.runPromise(client.pipe(Effect.flatMap((c) => c.device.create({}))));
    localStorage.setItem("bussy-device-id", result.id);
    localStorage.setItem("bussy-device-token", result.token);
    return result;
  },

  deleteDevice: async (deviceID: string) => {
    await makeRequest((c) => c.device.delete({ path: { id: deviceID } }));
    localStorage.removeItem("bussy-device-id");
    localStorage.removeItem("bussy-device-token");
    return { success: true };
  },

  getRoutes: async () => {
    return makeRequest((c) => c.meta.listRoutes({}));
  },

  getDirections: async (routeID: string) => {
    return makeRequest((c) => c.meta.listDirections({ path: { routeId: routeID } }));
  },

  getStops: async (routeID: string, directionID: string) => {
    return makeRequest((c) =>
      c.meta.listStops({
        path: { routeId: routeID, directionId: directionID },
      }),
    );
  },

  getSubscriptions: async () => {
    return makeRequest((c) => c.subscription.listSubscriptions({}));
  },

  createSubscription: async (_deviceID: string, subscription: SubscriptionCreationParamsType) => {
    return makeRequest((c) => c.subscription.createSubscription({ payload: subscription }));
  },

  getSubscription: async (id: string) => {
    return makeRequest((c) => c.subscription.getSubscription({ path: { id } }));
  },

  deleteSubscription: async (id: string) => {
    await makeRequest((c) => c.subscription.deleteSubscription({ path: { id } }));
    return { success: true };
  },

  getArrivals: async (_routeID: string, _directionID: string, _stopCode: string) => {
    return [];
  },

  getArrivalsBatch: async () => {
    return makeRequest((c) => c.arrival.listArrivalBatch({}));
  },

  getVapidPublicKey: async () => {
    return {
      publicKey:
        "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U",
    };
  },

  registerPushSubscription: async (
    deviceID: string,
    _subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) => {
    console.log("[STUB] Registered push subscription for device:", deviceID);
    return { success: true };
  },

  unregisterPushSubscription: async (deviceID: string) => {
    console.log("[STUB] Unregistered push subscription for device:", deviceID);
    return { success: true };
  },

  health: async () => {
    return makeRequest((c) => c.health.health({}));
  },
};
