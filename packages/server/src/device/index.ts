import { Schema, Effect } from "effect"
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/effect-schema"
import { eq } from "drizzle-orm"
import { DatabaseService } from "../drizzle"
import { deviceTable } from "./device.sql"
import { createID } from "../util/id"

export const DeviceInsert = createInsertSchema(deviceTable)
export const DeviceSelect = createSelectSchema(deviceTable)
export const DeviceUpdate = createUpdateSchema(deviceTable)

export type Device = Schema.Schema.Type<typeof DeviceSelect>

export class DeviceService extends Effect.Service<DeviceService>()("DeviceService", {
    effect: Effect.gen(function* () {
        const db = yield* DatabaseService
        return {
            create: Effect.fn("DeviceService.create")(function* () {
                const id = createID("device")
                const _res = yield* db.insert(deviceTable).values({
                    id,
                })
                return id
            }),
            getByID: Effect.fn("DeviceService.getByID")(function* (id: Device["id"]) {
                const res = yield* db.select()
                                    .from(deviceTable)
                                    .where(eq(deviceTable.id, id))
                                    .limit(1)
                                    .pipe(Effect.head)
                return res
            }),
            deleteByID: Effect.fn("DeviceService.deleteByID")(function* (id: Device["id"]) {
                const _res = yield* db.delete(deviceTable).where(eq(deviceTable.id, id))
                return
            })
        }
    }),
}){}