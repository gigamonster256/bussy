import { Effect } from "effect";
import { HttpApiBuilder, HttpApiError } from "@effect/platform";
import { BussyApi, CurrentDevice } from "@bussy/api";
import { SubscriptionService } from "../subscription";

export const HttpSubscriptionLive = HttpApiBuilder.group(BussyApi, "subscription", (handlers) =>
  Effect.gen(function* () {
    const subscriptionService = yield* SubscriptionService;

    return handlers
      .handle(
        "createSubscription",
        Effect.fn("HttpSubscriptionLive.createSubscription")(function* ({ payload }) {
          const device = yield* CurrentDevice;
          const subs = subscriptionService(device.id);

          const { id } = yield* subs.create(payload).pipe(
            Effect.tapError((error) => Effect.logError("Error creating subscription:", error)),
            Effect.mapError(() => new HttpApiError.InternalServerError()),
          );

          return yield* subs.getByID(id).pipe(
            Effect.tapError((error) =>
              Effect.logError(`Error fetching created subscription ${id}:`, error),
            ),
            Effect.mapError(() => new HttpApiError.InternalServerError()),
          );
        }),
      )
      .handle(
        "getSubscription",
        Effect.fn("HttpSubscriptionLive.getSubscription")(function* ({ path: { id } }) {
          const device = yield* CurrentDevice;
          const subs = subscriptionService(device.id);

          return yield* subs.getByID(id).pipe(
            Effect.tapError((error) =>
              Effect.logError(`Error fetching subscription ${id}:`, error),
            ),
            Effect.mapError(() => new HttpApiError.NotFound()),
          );
        }),
      )
      .handle(
        "listSubscriptions",
        Effect.fn("HttpSubscriptionLive.listSubscriptions")(function* () {
          const device = yield* CurrentDevice;
          const subs = subscriptionService(device.id);

          return yield* subs.getAll().pipe(
            Effect.tapError((error) => Effect.logError("Error listing subscriptions:", error)),
            Effect.mapError(() => new HttpApiError.InternalServerError()),
          );
        }),
      )
      .handle(
        "updateSubscription",
        Effect.fn("HttpSubscriptionLive.updateSubscription")(function* ({ path: { id }, payload }) {
          const device = yield* CurrentDevice;
          const subs = subscriptionService(device.id);

          return yield* subs.update(id, payload).pipe(
            Effect.tapError((error) =>
              Effect.logError(`Error updating subscription ${id}:`, error),
            ),
            Effect.mapError(() => new HttpApiError.NotFound()),
          );
        }),
      )
      .handle(
        "deleteSubscription",
        Effect.fn("HttpSubscriptionLive.deleteSubscription")(function* ({ path: { id } }) {
          const device = yield* CurrentDevice;
          const subs = subscriptionService(device.id);

          yield* subs.deleteByID(id).pipe(
            Effect.tapError((error) =>
              Effect.logError(`Error deleting subscription ${id}:`, error),
            ),
            Effect.mapError(() => new HttpApiError.InternalServerError()),
          );
        }),
      );
  }),
);
