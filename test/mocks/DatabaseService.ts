import { Effect, Layer } from "effect"
import type { Device, Subscription } from "../../src/db/index.ts"
import { DatabaseService } from "../../src/db/index.ts"
import type { Subscription as DomainSubscription } from "../../src/shared/domain.ts"

/**
 * In-memory mock DatabaseService for testing
 */
export const makeDatabaseServiceMock = (
  initialDevices: Array<Device> = [],
  initialSubscriptions: Array<Subscription> = []
): {
  layer: Layer.Layer<DatabaseService>
  getDevices: () => Array<Device>
  getSubscriptions: () => Array<Subscription>
} => {
  // In-memory storage
  const devices: Array<Device> = [...initialDevices]
  const subscriptions: Array<Subscription> = [...initialSubscriptions]

  const service = DatabaseService.make({
    upsertDevice: (deviceId: string) =>
      Effect.sync(() => {
        const existing = devices.find((d) => d.id === deviceId)
        if (existing) {
          existing.lastSeenAt = new Date()
          return existing
        }
        const device: Device = {
          id: deviceId,
          pushEndpoint: null,
          pushP256dh: null,
          pushAuth: null,
          createdAt: new Date(),
          lastSeenAt: new Date()
        }
        devices.push(device)
        return device
      }),

    updatePushSubscription: (deviceId, pushEndpoint, pushP256dh, pushAuth) =>
      Effect.sync(() => {
        const device = devices.find((d) => d.id === deviceId)
        if (device) {
          device.pushEndpoint = pushEndpoint || null
          device.pushP256dh = pushP256dh || null
          device.pushAuth = pushAuth || null
          device.lastSeenAt = new Date()
        }
      }),

    getDevice: (deviceId) =>
      Effect.sync(() => {
        return devices.find((d) => d.id === deviceId) ?? null
      }),

    addSubscription: (deviceId, subscription: DomainSubscription) =>
      Effect.sync(() => {
        const now = new Date()
        const sub: Subscription = {
          id: crypto.randomUUID(),
          deviceId,
          routeId: subscription.routeId,
          routeName: subscription.routeName,
          directionId: subscription.directionId,
          directionName: subscription.directionName,
          stopId: subscription.stopId,
          stopName: subscription.stopName,
          notifyMinutes: subscription.notifyMinutes,
          timeRangeStart: subscription.timeRangeStart,
          timeRangeEnd: subscription.timeRangeEnd,
          createdAt: now,
          updatedAt: now
        }
        subscriptions.push(sub)
        return sub
      }),

    getSubscriptions: (deviceId) =>
      Effect.sync(() => {
        return subscriptions.filter((s) => s.deviceId === deviceId)
      }),

    getSubscription: (subscriptionId) =>
      Effect.sync(() => {
        return subscriptions.find((s) => s.id === subscriptionId) ?? null
      }),

    deleteSubscription: (subscriptionId) =>
      Effect.sync(() => {
        const index = subscriptions.findIndex((s) => s.id === subscriptionId)
        if (index >= 0) {
          subscriptions.splice(index, 1)
        }
      }),

    deleteAllSubscriptions: (deviceId) =>
      Effect.sync(() => {
        for (let i = subscriptions.length - 1; i >= 0; i--) {
          if (subscriptions[i].deviceId === deviceId) {
            subscriptions.splice(i, 1)
          }
        }
      }),

    deleteDevice: (deviceId) =>
      Effect.sync(() => {
        // Delete subscriptions first
        for (let i = subscriptions.length - 1; i >= 0; i--) {
          if (subscriptions[i].deviceId === deviceId) {
            subscriptions.splice(i, 1)
          }
        }
        // Then delete device
        const index = devices.findIndex((d) => d.id === deviceId)
        if (index >= 0) {
          devices.splice(index, 1)
        }
      }),

    getDevicesForStop: (routeId, directionId, stopId) =>
      Effect.sync(() => {
        const matchingSubs = subscriptions.filter(
          (s) => s.routeId === routeId && s.directionId === directionId && s.stopId === stopId
        )
        return matchingSubs.map((sub) => ({
          device: devices.find((d) => d.id === sub.deviceId)!,
          subscription: sub
        })).filter((result) => result.device !== undefined)
      }),

    getActiveStops: Effect.sync(() => {
      const seen = new Set<string>()
      const result: Array<{ routeId: string; directionId: string; stopId: string }> = []
      for (const sub of subscriptions) {
        const key = `${sub.routeId}:${sub.directionId}:${sub.stopId}`
        if (!seen.has(key)) {
          seen.add(key)
          result.push({
            routeId: sub.routeId,
            directionId: sub.directionId,
            stopId: sub.stopId
          })
        }
      }
      return result
    }),

    close: Effect.succeed(undefined)
  })

  return {
    layer: Layer.succeed(DatabaseService, service),
    getDevices: () => [...devices],
    getSubscriptions: () => [...subscriptions]
  }
}
