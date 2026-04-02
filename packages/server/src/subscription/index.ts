import { Effect } from "effect"
import { eq, and } from "drizzle-orm"
import { DatabaseService } from "../drizzle"
import { subscriptionTable } from "./subscription.sql"
import { createID } from "../util/id"

// Re-export schemas and types from @bussy/schemas for consistency
export type { Subscription, SubscriptionCreationParamsType } from "@bussy/schemas"
export {
  SubscriptionSelect as SubscriptionSchema,
  SubscriptionInsert as SubscriptionInsertSchema,
  SubscriptionUpdate as SubscriptionUpdateSchema,
  SubscriptionCreationParams,
  SubscriptionCreationResponse
} from "@bussy/schemas"

export class SubscriptionService extends Effect.Service<SubscriptionService>()("SubscriptionService", {
    effect: Effect.gen(function*() {
        const db = yield* DatabaseService
        return (deviceID: string) => ({
            create: Effect.fn("SubscriptionService.create")(function* (params: {
                routeID: string
                directionID: string
                stopID: string
                notifyMinutes: number
                timeRangeStart: string
                timeRangeEnd: string
            }) {
                const id = createID("subscription")
                yield* db.insert(subscriptionTable).values({
                    id,
                    deviceID,
                    ...params
                })
                return { id }
            }),
            getByID: Effect.fn("SubscriptionService.getByID")(function* (id: string) {
                const res = yield* db.select()
                                    .from(subscriptionTable)
                                    .where(
                                      and(
                                        eq(subscriptionTable.id, id),
                                        eq(subscriptionTable.deviceID, deviceID)
                                    ))
                                    .limit(1)
                                    .pipe(Effect.head)
                return res
            }),
            getAll: Effect.fn("SubscriptionService.getAll")(function* () {
                const res = yield* db.select()
                                    .from(subscriptionTable)
                                    .where(eq(subscriptionTable.deviceID, deviceID))
                return res
            }),
            deleteByID: Effect.fn("SubscriptionService.deleteByID")(function* (id: string) {
                yield* db.delete(subscriptionTable).where(
                  and(
                    eq(subscriptionTable.id, id),
                    eq(subscriptionTable.deviceID, deviceID)
                ))
                return
            })
        })
    }),
}){}
