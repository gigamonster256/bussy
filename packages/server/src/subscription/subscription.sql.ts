import { index, mysqlTable, tinyint, varchar } from "drizzle-orm/mysql-core";
import { id, timestamp, timestamps, ulid } from "../drizzle/types";
import { deviceTable } from "../device/device.sql";
import {
  ROUTE_NAME_MAX_LENGTH,
  DIRECTION_NAME_MAX_LENGTH,
  STOP_NAME_MAX_LENGTH,
  TIME_RANGE_LENGTH,
  NOTIFY_MINUTES_DEFAULT,
  TIME_RANGE_START_DEFAULT,
  TIME_RANGE_END_DEFAULT,
} from "@bussy/schemas";

export const subscriptionTable = mysqlTable(
  "subscription",
  {
    ...id,
    deviceID: ulid("device_id")
      .references(() => deviceTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    routeName: varchar("route_name", { length: ROUTE_NAME_MAX_LENGTH }).notNull(),
    directionName: varchar("direction_name", { length: DIRECTION_NAME_MAX_LENGTH }).notNull(),
    stopName: varchar("stop_name", { length: STOP_NAME_MAX_LENGTH }).notNull(),
    notifyMinutes: tinyint("notify_minutes").notNull().default(NOTIFY_MINUTES_DEFAULT),
    timeRangeStart: varchar("time_range_start", { length: TIME_RANGE_LENGTH })
      .notNull()
      .default(TIME_RANGE_START_DEFAULT),
    timeRangeEnd: varchar("time_range_end", { length: TIME_RANGE_LENGTH })
      .notNull()
      .default(TIME_RANGE_END_DEFAULT),
    lastNotifiedDepartureTime: timestamp("last_notified_departure_time"),
    lastNotifiedAt: timestamp("last_notified_at"),
    ...timestamps,
  },
  (table) => [index("idx_subscriptions_device_id").on(table.deviceID)],
);
