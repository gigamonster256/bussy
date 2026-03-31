import { index, mysqlTable, tinyint, varchar } from "drizzle-orm/mysql-core"
import { id, timestamps, ulid } from "../drizzle/types";
import { deviceTable } from "../device/device.sql"

export const subscriptionTable = mysqlTable(
  "subscription",
  {
    ...id,
    deviceID: ulid("device_id")
        .references(() => deviceTable.id, {
            onDelete: "cascade",
        })
        .notNull(),
    routeID: varchar("route_id", { length: 64 }).notNull(),
    directionID: varchar("direction_id", { length: 64 }).notNull(),
    stopID: varchar("stop_id", { length: 64 }).notNull(),
    notifyMinutes: tinyint("notify_minutes").notNull().default(5),
    timeRangeStart: varchar("time_range_start", { length: 5 }).notNull().default("00:00"),
    timeRangeEnd: varchar("time_range_end", { length: 5 }).notNull().default("23:59"),
    ...timestamps,
  },
  (table) => [
    index("idx_subscriptions_device_id").on(table.deviceID),
    index("idx_subscriptions_route_stop").on(table.routeID, table.directionID, table.stopID)
  ]
)