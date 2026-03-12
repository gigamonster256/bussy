import { Config, Effect, Ref, Schedule } from "effect"
import { DatabaseService } from "../db"
import { AggieSpiritApi } from "./AggieSpiritApi"
import { NameResolver } from "./NameResolver"
import { type PushPayload, WebPushService } from "./WebPushService"

/**
 * Push Notification Orchestrator
 * Polls arrivals for all subscriptions in the database and sends push notifications
 * when buses are arriving within the user's notify window
 */
export class PushNotificationOrchestrator extends Effect.Service<PushNotificationOrchestrator>()(
  "PushNotificationOrchestrator",
  {
    effect: Effect.gen(function*() {
      const api = yield* AggieSpiritApi
      const database = yield* DatabaseService
      const pushService = yield* WebPushService
      const nameResolver = yield* NameResolver

      // Track which notifications we've already sent to avoid duplicates
      // Key: "deviceId:subscriptionId:arrivalEpoch"
      const sentNotifications = yield* Ref.make(new Set<string>())

      // Clean up old notification keys (older than 1 hour)
      const cleanupOldKeys = Effect.gen(function*() {
        const now = Date.now()
        const oneHourAgo = now - 60 * 60 * 1000

        yield* Ref.update(sentNotifications, (set) => {
          const newSet = new Set<string>()
          for (const key of set) {
            const parts = key.split(":")
            const arrivalTime = parseInt(parts[2], 10)
            if (arrivalTime > oneHourAgo) {
              newSet.add(key)
            }
          }
          return newSet
        })
      })

      // Check if we should send a notification for an arrival
      const shouldNotify = (
        arrivalTimeMs: number,
        notifyMinutes: number,
        timeRangeStart: string,
        timeRangeEnd: string
      ): boolean => {
        const now = new Date()
        const minutesUntilArrival = (arrivalTimeMs - now.getTime()) / 60000

        // Check if within notify window
        if (minutesUntilArrival < 0 || minutesUntilArrival > notifyMinutes) {
          return false
        }

        // Check if current time is within active time range
        const currentTime = now.toTimeString().slice(0, 5) // "HH:mm"
        if (timeRangeStart <= timeRangeEnd) {
          // Normal range (e.g., 07:00 - 22:00)
          if (currentTime < timeRangeStart || currentTime > timeRangeEnd) {
            return false
          }
        } else {
          // Overnight range (e.g., 22:00 - 02:00)
          if (currentTime < timeRangeStart && currentTime > timeRangeEnd) {
            return false
          }
        }

        return true
      }

      // Main polling loop
      const pollAndNotify = Effect.gen(function*() {
        // Get all unique route/direction/stop combinations
        const activeStops = yield* database.getActiveStops

        if (activeStops.length === 0) {
          return
        }

        yield* Effect.logDebug(`Checking ${activeStops.length} active stops for notifications`)

        // For each stop, get arrivals and check subscriptions
        for (const stop of activeStops) {
          const arrivals = yield* api
            .getNextDepartureTimes(stop.routeId, [stop.directionId], stop.stopId)
            .pipe(Effect.catchAll(() => Effect.succeed([])))

          if (arrivals.length === 0) continue

          // Get all devices/subscriptions for this stop
          const devicesWithSubs = yield* database.getDevicesForStop(
            stop.routeId,
            stop.directionId,
            stop.stopId
          )

          for (const { device, subscription } of devicesWithSubs) {
            // Skip devices without push subscription
            if (!device.pushEndpoint) continue

            // Check each arrival
            for (const arrival of arrivals) {
              const arrivalTime = arrival.estimatedDepartTimeUtc || arrival.scheduledDepartTimeUtc
              if (!arrivalTime) continue

              const arrivalMs = Number(arrivalTime.epochMillis)
              const notificationKey = `${device.id}:${subscription.id}:${arrivalMs}`

              // Check if we should notify
              if (
                !shouldNotify(
                  arrivalMs,
                  subscription.notifyMinutes,
                  subscription.timeRangeStart,
                  subscription.timeRangeEnd
                )
              ) {
                continue
              }

              // Check if we already sent this notification
              const alreadySent = yield* Ref.get(sentNotifications).pipe(
                Effect.map((set) => set.has(notificationKey))
              )

              if (alreadySent) continue

              // Send notification!
              const minutesAway = Math.round((arrivalMs - Date.now()) / 60000)

              // Resolve names for the notification
              const names = yield* nameResolver.resolveNames(
                subscription.routeId,
                subscription.directionId,
                subscription.stopId
              )

              const payload: PushPayload = {
                title: `${names.routeName} arriving soon!`,
                body: `${minutesAway} min away at ${names.stopName}`,
                tag: `arrival-${subscription.id}`,
                data: {
                  subscriptionId: subscription.id,
                  routeId: subscription.routeId,
                  stopId: subscription.stopId,
                  arrivalTime: arrivalMs
                }
              }

              yield* pushService.sendNotification(device, payload)
              yield* Effect.logInfo(
                `Sent push notification to device ${device.id.slice(0, 8)}... for ${names.routeName}`
              )

              // Mark as sent
              yield* Ref.update(sentNotifications, (set) => {
                const newSet = new Set(set)
                newSet.add(notificationKey)
                return newSet
              })

              // Only notify for the first upcoming arrival
              break
            }
          }
        }

        // Periodically clean up old keys
        yield* cleanupOldKeys
      })

      // Start the polling loop
      const pollingInterval = yield* Config.duration("POLLING_FREQUENT_INTERVAL")

      yield* Effect.forkDaemon(
        pollAndNotify.pipe(
          Effect.catchAll((e) => Effect.logError(`Push notification orchestrator error: ${e}`)),
          Effect.repeat(Schedule.spaced(pollingInterval))
        )
      )

      yield* Effect.logInfo("Push notification orchestrator started")

      return {}
    }),
    dependencies: [AggieSpiritApi.Default, DatabaseService.Default, WebPushService.Default, NameResolver.Default]
  }
) {}
