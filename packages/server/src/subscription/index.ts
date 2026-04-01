import { Schema, Effect } from "effect"
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/effect-schema"
import { eq, and } from "drizzle-orm"
import { DatabaseService } from "../drizzle"
import { subscriptionTable } from "./subscription.sql"
import { Device } from "../device"
import { createID } from "../util/id"

export const SubscriptionInsert = createInsertSchema(subscriptionTable)
export const SubscriptionSelect = createSelectSchema(subscriptionTable)
export const SubscriptionUpdate = createUpdateSchema(subscriptionTable)

export type Subscription = Schema.Schema.Type<typeof SubscriptionSelect>
export type SubscriptionCreationParams = Omit<Subscription, "id" | "deviceID" | "timeCreated" | "timeUpdated">

export class SubscriptionService extends Effect.Service<SubscriptionService>()("SubscriptionService", {
    effect: Effect.gen(function*() {
        const db = yield* DatabaseService
        return (deviceID: Device["id"]) => ({
            create: Effect.fn("SubscriptionService.create")(function* (params: SubscriptionCreationParams) {
                const id = createID("subscription")
                const _res = yield* db.insert(subscriptionTable).values({
                    id,
                    deviceID,
                    ...params
                })
                return id
            }),
            getByID: Effect.fn("SubscriptionService.getByID")(function* (id: Subscription["id"]) {
                const res = yield* db.select()
                                    .from(subscriptionTable)
                                    .where(and(
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
            deleteByID: Effect.fn("SubscriptionService.deleteByID")(function* (id: Subscription["id"]) {
                const _res = yield* db.delete(subscriptionTable).where(and(
                    eq(subscriptionTable.id, id),
                    eq(subscriptionTable.deviceID, deviceID)
                ))
                // FIXME: return if row was actually deleted or not
                return
            })
        })
    }),
}){}
