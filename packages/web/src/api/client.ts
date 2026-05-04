import { FetchHttpClient, HttpApiClient } from "@effect/platform";
import { Effect, Layer } from "effect";
import { BussyApi } from "@bussy/api";
import type { SubscriptionCreationParamsType } from "@bussy/api";
import { saveDevice, clearDevice, deviceToken } from "@/store/device";

const BASE_URL = "http://localhost:3000";

// TODO: rely on type inference instead of manually defining these types?

export type SubscriptionResponse = Awaited<ReturnType<typeof api.getSubscriptions>>[number];

export type ArrivalResponse = Awaited<ReturnType<typeof api.getArrivalsBatch>>[string][number];

const unauthenticatedClient = HttpApiClient.make(BussyApi, {
  baseUrl: BASE_URL,
}).pipe(Effect.provide(FetchHttpClient.layer));

const bootstrapDevice = unauthenticatedClient.pipe(
  Effect.flatMap((c) => c.device.create()),
  Effect.tap(saveDevice),
  Effect.map((r) => r.token),
);

const resolveAuthToken = deviceToken.get.pipe(
  Effect.catchTag("NoStoredValue", () => bootstrapDevice),
);

const AuthenticatedFetch = FetchHttpClient.layer.pipe(
  Layer.provide(
    Layer.effect(
      FetchHttpClient.RequestInit,
      resolveAuthToken.pipe(
        Effect.map((token) => ({
          headers: { Authorization: `Bearer ${token}` },
        })),
      ),
    ),
  ),
);

const client = HttpApiClient.make(BussyApi, { baseUrl: BASE_URL }).pipe(
  Effect.provide(AuthenticatedFetch),
);

type Client = Effect.Effect.Success<typeof client>;

const run = <A, E>(fn: (c: Client) => Effect.Effect<A, E, never>): Promise<A> =>
  Effect.runPromise(client.pipe(Effect.flatMap(fn)));

// ─── API Bridge ──────────────────────────────────────────────────────

export const api = {
  registerDevice: () => run((c) => c.device.create().pipe(Effect.tap(saveDevice))),

  deleteDevice: (deviceId: string) =>
    run((c) =>
      c.device.delete({ path: { id: deviceId } }).pipe(
        Effect.tap(() => clearDevice),
        Effect.as({ success: true as const }),
      ),
    ),

  getRoutes: () => run((c) => c.meta.listRoutes({})),

  getDirections: (routeId: string) => run((c) => c.meta.listDirections({ path: { routeId } })),

  getStops: (routeId: string, directionId: string) =>
    run((c) => c.meta.listStops({ path: { routeId, directionId } })),

  getSubscriptions: () => run((c) => c.subscription.listSubscriptions({})),

  createSubscription: (subscription: SubscriptionCreationParamsType) =>
    run((c) => c.subscription.createSubscription({ payload: subscription })),

  getSubscription: (id: string) => run((c) => c.subscription.getSubscription({ path: { id } })),

  deleteSubscription: (id: string) =>
    run((c) =>
      c.subscription
        .deleteSubscription({ path: { id } })
        .pipe(Effect.as({ success: true as const })),
    ),

  getArrivalsBatch: () => run((c) => c.arrival.listArrivalBatch({})),

  health: () => run((c) => c.health.health({})),

  // ─── Push Notifications ────────────────────────────────────────

  getVapidPublicKey: () => run((c) => c.health.getVapidPublicKey({})),

  registerPushSubscription: (
    deviceId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) => run((c) => c.device.registerPushSubscription({ path: { id: deviceId }, payload: subscription })),

  unregisterPushSubscription: (deviceId: string) =>
    run((c) => c.device.unregisterPushSubscription({ path: { id: deviceId } })),
};
