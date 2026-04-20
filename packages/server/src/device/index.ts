import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { DatabaseService } from "../drizzle";
import { deviceTable } from "./device.sql";
import { createID } from "@bussy/schemas";

export type { Device } from "@bussy/schemas";
export { DeviceSchema } from "@bussy/schemas";

export class DeviceService extends Effect.Service<DeviceService>()("DeviceService", {
  effect: Effect.gen(function* () {
    const db = yield* DatabaseService;
    return {
      create: Effect.fn("DeviceService.create")(function* () {
        const id = createID("device");
        const token = "test-token-" + id;
        yield* db.insert(deviceTable).values({
          id,
          token,
        });
        return { id, token };
      }),
      getByID: Effect.fn("DeviceService.getByID")(function* (id: string) {
        const res = yield* db
          .select()
          .from(deviceTable)
          .where(eq(deviceTable.id, id))
          .limit(1)
          .pipe(Effect.head);
        return res;
      }),
      getByToken: Effect.fn("DeviceService.getByToken")(function* (token: string) {
        yield* Effect.log("Looking up device by token:", token);
        const res = yield* db
          .select()
          .from(deviceTable)
          .where(eq(deviceTable.token, token))
          .limit(1)
          .pipe(Effect.head);
        return res;
      }),
      deleteByID: Effect.fn("DeviceService.deleteByID")(function* (id: string) {
        yield* db.delete(deviceTable).where(eq(deviceTable.id, id));
        return;
      }),
    };
  }),
}) {}
