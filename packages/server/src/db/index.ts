import { and, eq } from "drizzle-orm"
import type { MySql2Database } from "drizzle-orm/mysql2"
import { drizzle } from "drizzle-orm/mysql2"
import { migrate } from "drizzle-orm/mysql2/migrator"
import { Config, Effect, Redacted } from "effect"
import type { Pool } from "mysql2/promise"
import { createPool } from "mysql2/promise"
import type { Subscription as DomainSubscription } from "../../packages/server/src/shared/domain.ts"
import type { Device, Subscription } from "./schema/common.ts"
import * as schema from "./schema/mysql.ts"

// Re-export types
export type { Device, Subscription } from "./schema/common.ts"

/**
 * Database operations interface
 */
export interface DatabaseOperations {
  upsertDevice: (deviceId: string) => Effect.Effect<Device>
  updatePushSubscription: (
    deviceId: string,
    pushEndpoint: string,
    pushP256dh: string,
    pushAuth: string
  ) => Effect.Effect<void>
  getDevice: (deviceId: string) => Effect.Effect<Device | null>
  addSubscription: (deviceId: string, subscription: DomainSubscription) => Effect.Effect<Subscription>
  getSubscriptions: (deviceId: string) => Effect.Effect<Array<Subscription>>
  getSubscription: (subscriptionId: string) => Effect.Effect<Subscription | null>
  deleteSubscription: (subscriptionId: string) => Effect.Effect<void>
  deleteAllSubscriptions: (deviceId: string) => Effect.Effect<void>
  deleteDevice: (deviceId: string) => Effect.Effect<void>
  getDevicesForStop: (
    routeId: string,
    directionId: string,
    stopId: string
  ) => Effect.Effect<Array<{ device: Device; subscription: Subscription }>>
  getActiveStops: Effect.Effect<Array<{ routeId: string; directionId: string; stopId: string }>>
  close: Effect.Effect<void>
}

/**
 * Database service for managing devices and subscriptions.
 * Uses MySQL/MariaDB for both development and production.
 *
 * The connection pool is managed with acquireRelease to ensure
 * graceful shutdown when the layer's scope is closed.
 */
export class DatabaseService extends Effect.Service<DatabaseService>()("DatabaseService", {
  scoped: Effect.gen(function*() {
    const dbUrl = yield* Config.redacted("DATABASE_URL")

    yield* Effect.logInfo("Initializing MySQL database...")

    // Create connection pool with proper resource management
    // acquireRelease ensures pool.end() is called when scope closes
    const pool = yield* Effect.acquireRelease(
      Effect.sync(() => createPool(Redacted.value(dbUrl))),
      (pool) =>
        Effect.gen(function*() {
          yield* Effect.logInfo("Closing MySQL connection pool...")
          yield* Effect.tryPromise({
            try: () => pool.end(),
            catch: (e) => new Error(`Failed to close MySQL pool: ${e}`)
          })
          yield* Effect.logInfo("MySQL connection pool closed")
        }).pipe(Effect.orDie)
    )

    const db = drizzle(pool, { schema, mode: "default" })

    // Run migrations
    yield* Effect.tryPromise({
      try: () => migrate(db, { migrationsFolder: "./drizzle" }),
      catch: (e) => new Error(`MySQL migration failed: ${e}`)
    })

    yield* Effect.logInfo("MySQL database initialized successfully")

    return createOperations(db, pool)
  }).pipe(Effect.orDie),
  dependencies: []
}) {}

/**
 * Create database operations
 */
function createOperations(
  db: MySql2Database<typeof schema>,
  pool: Pool
): DatabaseOperations {
  return {
    upsertDevice: (deviceId: string) =>
      Effect.tryPromise({
        try: async () => {
          const existing = await db
            .select()
            .from(schema.devices)
            .where(eq(schema.devices.id, deviceId))

          if (existing.length > 0) {
            // Explicitly update lastSeenAt
            await db
              .update(schema.devices)
              .set({ lastSeenAt: new Date() })
              .where(eq(schema.devices.id, deviceId))
            const result = await db
              .select()
              .from(schema.devices)
              .where(eq(schema.devices.id, deviceId))
            return result[0] as Device
          } else {
            // Insert uses $defaultFn for createdAt and lastSeenAt
            await db.insert(schema.devices).values({ id: deviceId })
            const result = await db
              .select()
              .from(schema.devices)
              .where(eq(schema.devices.id, deviceId))
            return result[0] as Device
          }
        },
        catch: (error) => new Error(`upsertDevice failed: ${error}`)
      }).pipe(Effect.orDie),

    updatePushSubscription: (deviceId, pushEndpoint, pushP256dh, pushAuth) =>
      Effect.tryPromise({
        try: async () => {
          // $onUpdate handles lastSeenAt automatically
          await db
            .update(schema.devices)
            .set({
              pushEndpoint: pushEndpoint || null,
              pushP256dh: pushP256dh || null,
              pushAuth: pushAuth || null
            })
            .where(eq(schema.devices.id, deviceId))
        },
        catch: (error) => new Error(`updatePushSubscription failed: ${error}`)
      }).pipe(Effect.orDie),

    getDevice: (deviceId) =>
      Effect.tryPromise({
        try: async () => {
          const result = await db
            .select()
            .from(schema.devices)
            .where(eq(schema.devices.id, deviceId))
          return result.length > 0 ? (result[0] as Device) : null
        },
        catch: (error) => new Error(`getDevice failed: ${error}`)
      }).pipe(Effect.orDie),

    addSubscription: (deviceId, subscription) =>
      Effect.tryPromise({
        try: async () => {
          // Generate ID here since MySQL doesn't support returning()
          const id = crypto.randomUUID()
          await db.insert(schema.subscriptions).values({
            id,
            deviceId,
            routeId: subscription.routeId,
            directionId: subscription.directionId,
            stopId: subscription.stopId,
            notifyMinutes: subscription.notifyMinutes,
            timeRangeStart: subscription.timeRangeStart,
            timeRangeEnd: subscription.timeRangeEnd
          })

          const result = await db
            .select()
            .from(schema.subscriptions)
            .where(eq(schema.subscriptions.id, id))
          return result[0] as Subscription
        },
        catch: (error) => new Error(`addSubscription failed: ${error}`)
      }).pipe(Effect.orDie),

    getSubscriptions: (deviceId) =>
      Effect.tryPromise({
        try: async () => {
          const result = await db
            .select()
            .from(schema.subscriptions)
            .where(eq(schema.subscriptions.deviceId, deviceId))
          return result as Array<Subscription>
        },
        catch: (error) => new Error(`getSubscriptions failed: ${error}`)
      }).pipe(Effect.orDie),

    getSubscription: (subscriptionId) =>
      Effect.tryPromise({
        try: async () => {
          const result = await db
            .select()
            .from(schema.subscriptions)
            .where(eq(schema.subscriptions.id, subscriptionId))
          return result.length > 0 ? (result[0] as Subscription) : null
        },
        catch: (error) => new Error(`getSubscription failed: ${error}`)
      }).pipe(Effect.orDie),

    deleteSubscription: (subscriptionId) =>
      Effect.tryPromise({
        try: async () => {
          await db
            .delete(schema.subscriptions)
            .where(eq(schema.subscriptions.id, subscriptionId))
        },
        catch: (error) => new Error(`deleteSubscription failed: ${error}`)
      }).pipe(Effect.orDie),

    deleteAllSubscriptions: (deviceId) =>
      Effect.tryPromise({
        try: async () => {
          await db
            .delete(schema.subscriptions)
            .where(eq(schema.subscriptions.deviceId, deviceId))
        },
        catch: (error) => new Error(`deleteAllSubscriptions failed: ${error}`)
      }).pipe(Effect.orDie),

    deleteDevice: (deviceId) =>
      Effect.tryPromise({
        try: async () => {
          // FK constraint with ON DELETE CASCADE handles subscriptions automatically
          await db
            .delete(schema.devices)
            .where(eq(schema.devices.id, deviceId))
        },
        catch: (error) => new Error(`deleteDevice failed: ${error}`)
      }).pipe(Effect.orDie),

    getDevicesForStop: (routeId, directionId, stopId) =>
      Effect.tryPromise({
        try: async () => {
          const result = await db
            .select({
              device: schema.devices,
              subscription: schema.subscriptions
            })
            .from(schema.subscriptions)
            .innerJoin(
              schema.devices,
              eq(schema.subscriptions.deviceId, schema.devices.id)
            )
            .where(
              and(
                eq(schema.subscriptions.routeId, routeId),
                eq(schema.subscriptions.directionId, directionId),
                eq(schema.subscriptions.stopId, stopId)
              )
            )
          return result as Array<{ device: Device; subscription: Subscription }>
        },
        catch: (error) => new Error(`getDevicesForStop failed: ${error}`)
      }).pipe(Effect.orDie),

    getActiveStops: Effect.tryPromise({
      try: async () => {
        const result = await db
          .selectDistinct({
            routeId: schema.subscriptions.routeId,
            directionId: schema.subscriptions.directionId,
            stopId: schema.subscriptions.stopId
          })
          .from(schema.subscriptions)
        return result as Array<{ routeId: string; directionId: string; stopId: string }>
      },
      catch: (error) => new Error(`getActiveStops failed: ${error}`)
    }).pipe(Effect.orDie),

    close: Effect.tryPromise({
      try: async () => {
        await pool.end()
      },
      catch: (error) => new Error(`close failed: ${error}`)
    }).pipe(Effect.orDie)
  }
}
