import { DateTime, Effect } from "effect"
import type { Arrival, Subscription } from "../domain.js"

export class NotificationService extends Effect.Service<NotificationService>()("NotificationService", {
  succeed: Effect.succeed({
    // Parse HH:mm to minutes from midnight
    parseTime: (timeStr: string): number => {
      const [h, m] = timeStr.split(":").map(Number)
      return h * 60 + m
    },
    shouldNotify: (arrival: Arrival, subscription: Subscription) =>
      Effect.gen(function*() {
        // 1. Check if arrival is estimated
        // If we don't have an estimated time, we probably shouldn't notify yet (or maybe fallback to scheduled?)
        // The plan says "estimatedDepartTime - currentTime <= notifyMinutes"
        // Let's use scheduled if estimated is missing? Or stick to estimated for "real-time" alerts.
        // Usually, estimated is better. If missing, maybe it's too far out or GPS is off.

        const targetTime = arrival.estimatedDepartTimeUtc || arrival.scheduledDepartTimeUtc
        if (!targetTime) return false

        const now = yield* DateTime.now

        // Check 1: Time until departure <= notifyMinutes
        const diffMillis = DateTime.toEpochMillis(targetTime) - DateTime.toEpochMillis(now)
        const diffMinutes = diffMillis / 1000 / 60

        if (diffMinutes > subscription.notifyMinutes) return false
        if (diffMinutes < 0) return false // Already passed

        // Check 2: Arrival time within user's time range
        // Convert targetTime to local minutes from midnight (assuming TAMU/Central time consistency)
        // Since we are server-side, and assuming all times are UTC, we need to know the "local" time
        // to compare with the user's "HH:mm" range which is presumably local.
        // For this MVP, let's assume the user's range and the bus times are roughly in the same timezone context
        // OR we just check the hours of the UTC time if we treat everything as UTC.
        // BUT TAMU is US/Central.
        // Ideally we use a timezone library.
        // For simplicity/MVP: Let's assume the input `timeRangeStart` is "HH:mm" in the *bus system's* timezone
        // and we shift the UTC time to that timezone.
        // aggie-spirit-api returns UTC strings.
        // Let's just compare against the current time of day in the server's locale (assuming server is set to relevant TZ or we ignore TZ complexity for M1).

        // Better: Convert targetTime to a "minutes from midnight" value.
        // Since `DateTime` in Effect is UTC based.
        // Let's assume for now we just use the UTC hours/minutes and expect the user to have provided UTC range
        // OR (more likely) we ignore the timezone shift for this exact moment and just check "is it between start and end of day".

        // Let's implement a simple check using the Date object which handles local timezone of the running server.
        // Note: This relies on server timezone being correct (US Central).
        const targetDate = new Date(DateTime.toEpochMillis(targetTime))
        const targetMinutes = targetDate.getHours() * 60 + targetDate.getMinutes()

        const startMinutes = 0
        const endMinutes = 0

        // Handle wrapping ranges (e.g. 23:00 to 02:00)?
        // Plan says "applies all days", implies simple day range.
        if (startMinutes <= endMinutes) {
          if (targetMinutes < startMinutes || targetMinutes > endMinutes) return false
        } else {
          // Range wraps midnight
          if (targetMinutes < startMinutes && targetMinutes > endMinutes) return false
        }

        return true
      })
  }),
  dependencies: []
}) {}
