import { Effect } from "effect";
import { eq, and } from "drizzle-orm";
import { DatabaseService } from "../drizzle";
import { subscriptionTable } from "./subscription.sql";
import { createID } from "@bussy/schemas";
import type { SubscriptionUpdateParamsType } from "@bussy/schemas";

export type {
  Subscription,
  SubscriptionCreationParamsType,
  SubscriptionUpdateParamsType,
} from "@bussy/schemas";
export {
  SubscriptionSchema,
  SubscriptionCreationParams,
  SubscriptionUpdateParams,
  SubscriptionCreationResponse,
} from "@bussy/schemas";

export class SubscriptionService extends Effect.Service<SubscriptionService>()(
  "SubscriptionService",
  {
    effect: Effect.gen(function* () {
      const db = yield* DatabaseService;
      return (deviceID: string) => ({
        create: Effect.fn("SubscriptionService.create")(function* (params: {
          routeName: string;
          directionName: string;
          stopName: string;
          notifyMinutes: number;
          timeRangeStart: string;
          timeRangeEnd: string;
        }) {
          const id = createID("subscription");
          yield* db.insert(subscriptionTable).values({
            id,
            deviceID,
            routeName: params.routeName,
            directionName: params.directionName,
            stopName: params.stopName,
            notifyMinutes: params.notifyMinutes,
            timeRangeStart: params.timeRangeStart,
            timeRangeEnd: params.timeRangeEnd,
          });
          return { id };
        }),
        getByID: Effect.fn("SubscriptionService.getByID")(function* (id: string) {
          const res = yield* db
            .select()
            .from(subscriptionTable)
            .where(and(eq(subscriptionTable.id, id), eq(subscriptionTable.deviceID, deviceID)))
            .limit(1)
            .pipe(Effect.head);
          return res;
        }),
        getAll: Effect.fn("SubscriptionService.getAll")(function* () {
          const res = yield* db
            .select()
            .from(subscriptionTable)
            .where(eq(subscriptionTable.deviceID, deviceID));
          return res;
        }),
        update: Effect.fn("SubscriptionService.update")(function* (
          id: string,
          params: SubscriptionUpdateParamsType,
        ) {
          const _res = yield* db
            .update(subscriptionTable)
            .set({
              ...params,
            })
            .where(and(eq(subscriptionTable.id, id), eq(subscriptionTable.deviceID, deviceID)));
          const res = yield* db
            .select()
            .from(subscriptionTable)
            .where(and(eq(subscriptionTable.id, id), eq(subscriptionTable.deviceID, deviceID)))
            .limit(1)
            .pipe(Effect.head);
          return res;
        }),
        deleteByID: Effect.fn("SubscriptionService.deleteByID")(function* (id: string) {
          yield* db
            .delete(subscriptionTable)
            .where(and(eq(subscriptionTable.id, id), eq(subscriptionTable.deviceID, deviceID)));
          return;
        }),
      });
    }),
  },
) {}
