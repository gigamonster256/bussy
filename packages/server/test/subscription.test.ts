import { describe, expect, it } from "@effect/vitest"
import { Cause, Effect, Layer, Option } from "effect"
import { DeviceService } from "../src/device"
import { SubscriptionService } from "../src/subscription"
import { TestDatabaseLive } from "./fixtures"

const TestLayer = Layer.mergeAll(
  DeviceService.Default,
  SubscriptionService.Default
).pipe(Layer.provide(TestDatabaseLive))

const validSubscriptionParams = {
  routeID: "route-123",
  directionID: "inbound",
  stopID: "stop-456",
  notifyMinutes: 10,
  timeRangeStart: "08:00",
  timeRangeEnd: "18:00"
}

describe("SubscriptionService", () => {
  describe("create", () => {
    it.effect("should create subscription and return id", () =>
      Effect.gen(function* () {
        const deviceService = yield* DeviceService
        const subscriptionService = yield* SubscriptionService

        const device = yield* deviceService.create()
        const subs = subscriptionService(device.id)

        const result = yield* subs.create(validSubscriptionParams)

        expect(result.id).toMatch(/^sub_/)

        yield* subs.deleteByID(result.id)
        yield* deviceService.deleteByID(device.id)
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect("should generate unique ids", () =>
      Effect.gen(function* () {
        const deviceService = yield* DeviceService
        const subscriptionService = yield* SubscriptionService

        const device = yield* deviceService.create()
        const subs = subscriptionService(device.id)

        const results = yield* Effect.all([
          subs.create(validSubscriptionParams),
          subs.create({ ...validSubscriptionParams, routeID: "route-456" }),
          subs.create({ ...validSubscriptionParams, stopID: "stop-789" })
        ])

        const ids = new Set(results.map(r => r.id))
        expect(ids.size).toBe(3)

        yield* Effect.all(results.map(r => subs.deleteByID(r.id)))
        yield* deviceService.deleteByID(device.id)
      }).pipe(Effect.provide(TestLayer))
    )
  })

  describe("getByID", () => {
    it.effect("should return subscription when found", () =>
      Effect.gen(function* () {
        const deviceService = yield* DeviceService
        const subscriptionService = yield* SubscriptionService

        const device = yield* deviceService.create()
        const subs = subscriptionService(device.id)

        const created = yield* subs.create(validSubscriptionParams)
        const found = yield* subs.getByID(created.id)

        expect(found.id).toBe(created.id)
        expect(found.deviceID).toBe(device.id)
        expect(found.routeID).toBe(validSubscriptionParams.routeID)
        expect(found.stopID).toBe(validSubscriptionParams.stopID)

        yield* subs.deleteByID(created.id)
        yield* deviceService.deleteByID(device.id)
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect("should fail when subscription not found", () =>
      Effect.gen(function* () {
        const deviceService = yield* DeviceService
        const subscriptionService = yield* SubscriptionService

        const device = yield* deviceService.create()
        const subs = subscriptionService(device.id)

        const result = yield* subs.getByID("sub_00000000000000000000000000").pipe(Effect.exit)

        expect(result._tag).toBe("Failure")
        if (result._tag === "Failure") {
          const error = Cause.failureOption(result.cause)
          expect(Option.isSome(error)).toBe(true)
        }

        yield* deviceService.deleteByID(device.id)
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect("should not return subscription belonging to different device", () =>
      Effect.gen(function* () {
        const deviceService = yield* DeviceService
        const subscriptionService = yield* SubscriptionService

        const device1 = yield* deviceService.create()
        const device2 = yield* deviceService.create()

        const subs1 = subscriptionService(device1.id)
        const subs2 = subscriptionService(device2.id)

        const created = yield* subs1.create(validSubscriptionParams)
        const result = yield* subs2.getByID(created.id).pipe(Effect.exit)

        expect(result._tag).toBe("Failure")

        yield* subs1.deleteByID(created.id)
        yield* deviceService.deleteByID(device1.id)
        yield* deviceService.deleteByID(device2.id)
      }).pipe(Effect.provide(TestLayer))
    )
  })

  describe("getAll", () => {
    it.effect("should return all subscriptions for device", () =>
      Effect.gen(function* () {
        const deviceService = yield* DeviceService
        const subscriptionService = yield* SubscriptionService

        const device = yield* deviceService.create()
        const subs = subscriptionService(device.id)

        const sub1 = yield* subs.create(validSubscriptionParams)
        const sub2 = yield* subs.create({ ...validSubscriptionParams, routeID: "route-456" })

        const all = yield* subs.getAll()

        expect(all.length).toBe(2)
        expect(all.map(s => s.id).sort()).toEqual([sub1.id, sub2.id].sort())

        yield* subs.deleteByID(sub1.id)
        yield* subs.deleteByID(sub2.id)
        yield* deviceService.deleteByID(device.id)
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect("should return empty array when no subscriptions", () =>
      Effect.gen(function* () {
        const deviceService = yield* DeviceService
        const subscriptionService = yield* SubscriptionService

        const device = yield* deviceService.create()
        const subs = subscriptionService(device.id)

        const all = yield* subs.getAll()

        expect(all).toEqual([])

        yield* deviceService.deleteByID(device.id)
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect("should only return subscriptions for the specific device", () =>
      Effect.gen(function* () {
        const deviceService = yield* DeviceService
        const subscriptionService = yield* SubscriptionService

        const device1 = yield* deviceService.create()
        const device2 = yield* deviceService.create()

        const subs1 = subscriptionService(device1.id)
        const subs2 = subscriptionService(device2.id)

        const sub1 = yield* subs1.create(validSubscriptionParams)
        const sub2 = yield* subs2.create({ ...validSubscriptionParams, routeID: "route-456" })

        const device1Subs = yield* subs1.getAll()
        const device2Subs = yield* subs2.getAll()

        expect(device1Subs.length).toBe(1)
        expect(device1Subs[0]?.id).toBe(sub1.id)
        expect(device2Subs.length).toBe(1)
        expect(device2Subs[0]?.id).toBe(sub2.id)

        yield* subs1.deleteByID(sub1.id)
        yield* subs2.deleteByID(sub2.id)
        yield* deviceService.deleteByID(device1.id)
        yield* deviceService.deleteByID(device2.id)
      }).pipe(Effect.provide(TestLayer))
    )
  })

  describe("deleteByID", () => {
    it.effect("should delete subscription", () =>
      Effect.gen(function* () {
        const deviceService = yield* DeviceService
        const subscriptionService = yield* SubscriptionService

        const device = yield* deviceService.create()
        const subs = subscriptionService(device.id)

        const created = yield* subs.create(validSubscriptionParams)
        yield* subs.deleteByID(created.id)

        const result = yield* subs.getByID(created.id).pipe(Effect.exit)
        expect(result._tag).toBe("Failure")

        yield* deviceService.deleteByID(device.id)
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect("should not throw when deleting non-existent subscription", () =>
      Effect.gen(function* () {
        const deviceService = yield* DeviceService
        const subscriptionService = yield* SubscriptionService

        const device = yield* deviceService.create()
        const subs = subscriptionService(device.id)

        yield* subs.deleteByID("sub_00000000000000000000000000")

        yield* deviceService.deleteByID(device.id)
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect("should not delete subscription belonging to different device", () =>
      Effect.gen(function* () {
        const deviceService = yield* DeviceService
        const subscriptionService = yield* SubscriptionService

        const device1 = yield* deviceService.create()
        const device2 = yield* deviceService.create()

        const subs1 = subscriptionService(device1.id)
        const subs2 = subscriptionService(device2.id)

        const created = yield* subs1.create(validSubscriptionParams)
        yield* subs2.deleteByID(created.id)

        const found = yield* subs1.getByID(created.id)
        expect(found.id).toBe(created.id)

        yield* subs1.deleteByID(created.id)
        yield* deviceService.deleteByID(device1.id)
        yield* deviceService.deleteByID(device2.id)
      }).pipe(Effect.provide(TestLayer))
    )
  })

  describe("cascade delete", () => {
    it.effect("should delete subscriptions when device is deleted", () =>
      Effect.gen(function* () {
        const deviceService = yield* DeviceService
        const subscriptionService = yield* SubscriptionService

        const device = yield* deviceService.create()
        const subs = subscriptionService(device.id)

        yield* subs.create(validSubscriptionParams)
        yield* subs.create({ ...validSubscriptionParams, routeID: "route-456" })

        yield* deviceService.deleteByID(device.id)

        const all = yield* subs.getAll()
        expect(all).toEqual([])
      }).pipe(Effect.provide(TestLayer))
    )
  })
})
