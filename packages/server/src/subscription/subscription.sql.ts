import { index, mysqlTable, tinyint, varchar } from "drizzle-orm/mysql-core"
import { id, timestamps, ulid } from "../drizzle/types";
import { deviceTable } from "../device/device.sql"
import {
  ROUTE_ID_MAX_LENGTH,
  DIRECTION_ID_MAX_LENGTH,
  STOP_ID_MAX_LENGTH,
  TIME_RANGE_LENGTH,
  NOTIFY_MINUTES_DEFAULT,
  TIME_RANGE_START_DEFAULT,
  TIME_RANGE_END_DEFAULT
} from "@bussy/schemas"

export const subscriptionTable = mysqlTable(
  "subscription",
  {
    ...id,
    deviceID: ulid("device_id")
        .references(() => deviceTable.id, {
            onDelete: "cascade",
        })
        .notNull(),
    routeID: varchar("route_id", { length: ROUTE_ID_MAX_LENGTH }).notNull(),
    directionID: varchar("direction_id", { length: DIRECTION_ID_MAX_LENGTH }).notNull(),
    stopID: varchar("stop_id", { length: STOP_ID_MAX_LENGTH }).notNull(),
    notifyMinutes: tinyint("notify_minutes").notNull().default(NOTIFY_MINUTES_DEFAULT),
    timeRangeStart: varchar("time_range_start", { length: TIME_RANGE_LENGTH }).notNull().default(TIME_RANGE_START_DEFAULT),
    timeRangeEnd: varchar("time_range_end", { length: TIME_RANGE_LENGTH }).notNull().default(TIME_RANGE_END_DEFAULT),
    ...timestamps,
  },
  (table) => [
    index("idx_subscriptions_device_id").on(table.deviceID),
    index("idx_subscriptions_route_stop").on(table.routeID, table.directionID, table.stopID)
  ]
)
