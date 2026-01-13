import { Effect } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import { DatabaseService } from "../../src/db/index.ts"
import { makeDatabaseServiceMock } from "../mocks/DatabaseService.ts"

describe("DatabaseService (Mock)", () => {
  let mockDb: ReturnType<typeof makeDatabaseServiceMock>

  beforeEach(() => {
    mockDb = makeDatabaseServiceMock()
  })

  describe("upsertDevice", () => {
    it("should create a new device", async () => {
      const program = Effect.gen(function*() {
        const db = yield* DatabaseService
        const device = yield* db.upsertDevice("device-123")

        expect(device.id).toBe("device-123")
        expect(device.pushEndpoint).toBeNull()
        expect(device.createdAt).toBeInstanceOf(Date)
      })

      await Effect.runPromise(program.pipe(Effect.provide(mockDb.layer)))

      expect(mockDb.getDevices()).toHaveLength(1)
    })

    it("should update lastSeenAt for existing device", async () => {
      const program = Effect.gen(function*() {
        const db = yield* DatabaseService

        const device1 = yield* db.upsertDevice("device-123")
        const firstSeen = device1.lastSeenAt

        // Small delay to ensure time difference
        yield* Effect.sleep("10 millis")

        const device2 = yield* db.upsertDevice("device-123")

        expect(device2.id).toBe("device-123")
        expect(device2.lastSeenAt.getTime()).toBeGreaterThanOrEqual(firstSeen.getTime())
      })

      await Effect.runPromise(program.pipe(Effect.provide(mockDb.layer)))

      // Should still only be one device
      expect(mockDb.getDevices()).toHaveLength(1)
    })
  })

  describe("updatePushSubscription", () => {
    it("should update push subscription for device", async () => {
      const program = Effect.gen(function*() {
        const db = yield* DatabaseService

        yield* db.upsertDevice("device-123")
        yield* db.updatePushSubscription(
          "device-123",
          "https://push.example.com",
          "p256dh-key",
          "auth-key"
        )

        const device = yield* db.getDevice("device-123")
        expect(device?.pushEndpoint).toBe("https://push.example.com")
        expect(device?.pushP256dh).toBe("p256dh-key")
        expect(device?.pushAuth).toBe("auth-key")
      })

      await Effect.runPromise(program.pipe(Effect.provide(mockDb.layer)))
    })
  })

  describe("subscriptions", () => {
    it("should add and retrieve subscriptions", async () => {
      const program = Effect.gen(function*() {
        const db = yield* DatabaseService

        yield* db.upsertDevice("device-123")

        const sub = yield* db.addSubscription("device-123", {
          routeId: "route-1",
          directionId: "dir-1",
          stopId: "stop-1",
          notifyMinutes: 5,
          timeRangeStart: "07:00",
          timeRangeEnd: "22:00"
        })

        expect(sub.id).toBeDefined()
        expect(sub.routeId).toBe("route-1")

        const subs = yield* db.getSubscriptions("device-123")
        expect(subs).toHaveLength(1)
        expect(subs[0].routeId).toBe("route-1")
      })

      await Effect.runPromise(program.pipe(Effect.provide(mockDb.layer)))
    })

    it("should get single subscription by id", async () => {
      const program = Effect.gen(function*() {
        const db = yield* DatabaseService

        yield* db.upsertDevice("device-123")
        const sub = yield* db.addSubscription("device-123", {
          routeId: "route-1",
          directionId: "dir-1",
          stopId: "stop-1",
          notifyMinutes: 5,
          timeRangeStart: "07:00",
          timeRangeEnd: "22:00"
        })

        const retrieved = yield* db.getSubscription(sub.id)
        expect(retrieved?.id).toBe(sub.id)
        expect(retrieved?.routeId).toBe("route-1")
      })

      await Effect.runPromise(program.pipe(Effect.provide(mockDb.layer)))
    })

    it("should return null for non-existent subscription", async () => {
      const program = Effect.gen(function*() {
        const db = yield* DatabaseService
        const sub = yield* db.getSubscription("non-existent")
        expect(sub).toBeNull()
      })

      await Effect.runPromise(program.pipe(Effect.provide(mockDb.layer)))
    })

    it("should delete subscription", async () => {
      const program = Effect.gen(function*() {
        const db = yield* DatabaseService

        yield* db.upsertDevice("device-123")
        const sub = yield* db.addSubscription("device-123", {
          routeId: "route-1",
          directionId: "dir-1",
          stopId: "stop-1",
          notifyMinutes: 5,
          timeRangeStart: "07:00",
          timeRangeEnd: "22:00"
        })

        yield* db.deleteSubscription(sub.id)

        const retrieved = yield* db.getSubscription(sub.id)
        expect(retrieved).toBeNull()
      })

      await Effect.runPromise(program.pipe(Effect.provide(mockDb.layer)))
    })
  })

  describe("deleteDevice", () => {
    it("should delete device and its subscriptions", async () => {
      const program = Effect.gen(function*() {
        const db = yield* DatabaseService

        yield* db.upsertDevice("device-123")
        yield* db.addSubscription("device-123", {
          routeId: "route-1",
          directionId: "dir-1",
          stopId: "stop-1",
          notifyMinutes: 5,
          timeRangeStart: "07:00",
          timeRangeEnd: "22:00"
        })

        yield* db.deleteDevice("device-123")

        const device = yield* db.getDevice("device-123")
        expect(device).toBeNull()

        const subs = yield* db.getSubscriptions("device-123")
        expect(subs).toHaveLength(0)
      })

      await Effect.runPromise(program.pipe(Effect.provide(mockDb.layer)))

      expect(mockDb.getDevices()).toHaveLength(0)
      expect(mockDb.getSubscriptions()).toHaveLength(0)
    })
  })

  describe("getDevicesForStop", () => {
    it("should return devices with subscriptions for a stop", async () => {
      const program = Effect.gen(function*() {
        const db = yield* DatabaseService

        // Create two devices with subscriptions to the same stop
        yield* db.upsertDevice("device-1")
        yield* db.updatePushSubscription("device-1", "https://push/1", "key1", "auth1")
        yield* db.addSubscription("device-1", {
          routeId: "route-1",
          directionId: "dir-1",
          stopId: "stop-1",
          notifyMinutes: 5,
          timeRangeStart: "07:00",
          timeRangeEnd: "22:00"
        })

        yield* db.upsertDevice("device-2")
        yield* db.updatePushSubscription("device-2", "https://push/2", "key2", "auth2")
        yield* db.addSubscription("device-2", {
          routeId: "route-1",
          directionId: "dir-1",
          stopId: "stop-1",
          notifyMinutes: 10,
          timeRangeStart: "06:00",
          timeRangeEnd: "23:00"
        })

        // Different stop
        yield* db.upsertDevice("device-3")
        yield* db.addSubscription("device-3", {
          routeId: "route-1",
          directionId: "dir-1",
          stopId: "stop-2",
          notifyMinutes: 5,
          timeRangeStart: "07:00",
          timeRangeEnd: "22:00"
        })

        const result = yield* db.getDevicesForStop("route-1", "dir-1", "stop-1")

        expect(result).toHaveLength(2)
        expect(result.map((r) => r.device.id).sort()).toEqual(["device-1", "device-2"])
      })

      await Effect.runPromise(program.pipe(Effect.provide(mockDb.layer)))
    })
  })

  describe("getActiveStops", () => {
    it("should return unique stops with subscriptions", async () => {
      const program = Effect.gen(function*() {
        const db = yield* DatabaseService

        yield* db.upsertDevice("device-1")
        yield* db.addSubscription("device-1", {
          routeId: "route-1",
          directionId: "dir-1",
          stopId: "stop-1",
          notifyMinutes: 5,
          timeRangeStart: "07:00",
          timeRangeEnd: "22:00"
        })

        yield* db.upsertDevice("device-2")
        yield* db.addSubscription("device-2", {
          routeId: "route-1",
          directionId: "dir-1",
          stopId: "stop-1",
          notifyMinutes: 10,
          timeRangeStart: "06:00",
          timeRangeEnd: "23:00"
        })

        yield* db.addSubscription("device-2", {
          routeId: "route-2",
          directionId: "dir-2",
          stopId: "stop-2",
          notifyMinutes: 5,
          timeRangeStart: "07:00",
          timeRangeEnd: "22:00"
        })

        const stops = yield* db.getActiveStops

        // Should only have 2 unique stops
        expect(stops).toHaveLength(2)
      })

      await Effect.runPromise(program.pipe(Effect.provide(mockDb.layer)))
    })
  })
})
