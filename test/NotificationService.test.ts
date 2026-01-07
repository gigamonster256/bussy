import { DateTime, Effect } from "effect"
import { describe, expect, it } from "vitest"
import type { Arrival, Subscription } from "../src/domain.js"
import { NotificationService } from "../src/services/NotificationService.js"

const baseSubscription: Subscription = {
  routeId: "r1",
  directionId: "d1",
  stopId: "s1",
  notifyMinutes: 10,
  timeRangeStart: "08:00",
  timeRangeEnd: "17:00",
  routeName: "R",
  directionName: "D",
  stopName: "S"
}

// Helper to create arrival relative to "now"
const createArrival = (minutesFromNow: number, now: number): Arrival => ({
  routeId: "r1",
  directionId: "d1",
  stopCode: "s1",
  estimatedDepartTimeUtc: DateTime.unsafeMake(now + minutesFromNow * 60 * 1000),
  scheduledDepartTimeUtc: undefined,
  isRealtime: true,
  isOffRoute: false
})

describe("NotificationService", () => {
  it("should notify when within time window and range", async () => {
    // Set fixed time: 10:00 AM
    const now = new Date()
    now.setHours(10, 0, 0, 0)
    const nowMillis = now.getTime()

    const program = Effect.gen(function*() {
      const service = yield* NotificationService

      // 5 minutes away (should notify, limit is 10)
      const arrival1 = createArrival(5, nowMillis)
      const result1 = yield* service.shouldNotify(arrival1, baseSubscription)
      expect(result1).toBe(true)

      // 15 minutes away (should NOT notify, limit is 10)
      const arrival2 = createArrival(15, nowMillis)
      const result2 = yield* service.shouldNotify(arrival2, baseSubscription)
      expect(result2).toBe(false)

      // 5 minutes away BUT outside time range (e.g. 10:00 AM vs range 18:00-19:00)
      const subBadRange = { ...baseSubscription, timeRangeStart: "18:00", timeRangeEnd: "19:00" }
      const result3 = yield* service.shouldNotify(arrival1, subBadRange)
      expect(result3).toBe(false)
    }).pipe(
      // Manually provide a Clock that returns our fixed time
      Effect.withClock({
        unsafeCurrentTimeMillis: () => nowMillis,
        currentTimeMillis: Effect.succeed(nowMillis),
        sleep: () => Effect.void
      } as any)
    )

    await Effect.runPromise(program.pipe(Effect.provide(NotificationService.Default)))
  })
})
