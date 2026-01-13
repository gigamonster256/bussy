import { datetime, index, mysqlTable, text, tinyint, varchar } from "drizzle-orm/mysql-core"

/**
 * MySQL/MariaDB schema for the bus notifier application.
 * Used for production deployment.
 */

/**
 * Devices table - stores anonymous device identifiers
 * Note: device ID is provided by client, not auto-generated
 */
export const devices = mysqlTable("devices", {
  id: varchar("id", { length: 36 }).primaryKey(),
  pushEndpoint: text("push_endpoint"),
  pushP256dh: text("push_p256dh"),
  pushAuth: text("push_auth"),
  createdAt: datetime("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  lastSeenAt: datetime("last_seen_at")
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
})

/**
 * Subscriptions table - stores notification preferences
 * Uses UUID string as primary key
 * Foreign key to devices table with cascade delete
 */
export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    deviceId: varchar("device_id", { length: 36 })
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    routeId: varchar("route_id", { length: 64 }).notNull(),
    directionId: varchar("direction_id", { length: 64 }).notNull(),
    stopId: varchar("stop_id", { length: 64 }).notNull(),
    notifyMinutes: tinyint("notify_minutes").notNull().default(5),
    timeRangeStart: varchar("time_range_start", { length: 5 }).notNull().default("00:00"),
    timeRangeEnd: varchar("time_range_end", { length: 5 }).notNull().default("23:59"),
    createdAt: datetime("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: datetime("updated_at")
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
  },
  (table) => [
    index("idx_subscriptions_device_id").on(table.deviceId),
    index("idx_subscriptions_route_stop").on(table.routeId, table.directionId, table.stopId)
  ]
)
