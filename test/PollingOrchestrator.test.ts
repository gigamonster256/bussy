import { Chunk, DateTime, Duration, Effect, Fiber, Layer, Stream, TestClock, TestContext } from "effect"
import { describe, expect, it } from "vitest"
import type { Arrival, Subscription } from "../src/domain.js"
import { AggieSpiritApi } from "../src/services/AggieSpiritApi.js"
import { NotificationService } from "../src/services/NotificationService.js"
import { PollingOrchestrator } from "../src/services/PollingOrchestrator.js"
import { keyToString, SubscriptionStore } from "../src/services/SubscriptionStore.js"

// Mocks
const mockArrival: Arrival = {
  routeId: "01",
  directionId: "d1",
  stopCode: "s1",
  estimatedDepartTimeUtc: DateTime.unsafeNow(),
  scheduledDepartTimeUtc: undefined,
  isRealtime: false,
  isOffRoute: false
}

const mockSub: Subscription = {
  routeId: "01",
  directionId: "d1",
  stopId: "s1",
  notifyMinutes: 5,
  timeRangeStart: "00:00",
  timeRangeEnd: "23:59",
  routeName: "R1",
  directionName: "D1",
  stopName: "S1"
}

const key = keyToString(mockSub)

// Test Layer Construction
const makeTestLayer = (arrivals: Array<Arrival>) => {
  // We cast to any/unknown to bypass the _tag check that Effect.Service adds to the type definition
  // In runtime, the plain object is sufficient as long as we use the correct Tag
  const apiMockValue = {
    getBaseData: () => Effect.succeed([]),
    getPatternPaths: () => Effect.succeed([]),
    getNextDepartureTimes: () => Effect.succeed(arrivals)
  }

  const ApiMock = Layer.succeed(AggieSpiritApi, apiMockValue as unknown as AggieSpiritApi)

  const notifMockValue = {
    shouldNotify: () => Effect.succeed(false)
  }

  const NotificationMock = Layer.succeed(NotificationService, notifMockValue as unknown as NotificationService)

  return Layer.mergeAll(
    ApiMock,
    NotificationMock,
    SubscriptionStore.Default,
    PollingOrchestrator.Default
  )
}

describe("PollingOrchestrator", () => {
  it("should start and stop polling based on active subscriptions", async () => {
    const program = Effect.gen(function*() {
      const store = yield* SubscriptionStore
      // We don't need to call orchestrator methods, just ensure the layer is running

      // Initial state: no active keys
      // Add a client to trigger polling
      yield* store.addClient(mockSub)

      // The orchestrator runs in background.
      // Wait for manager to pick it up (runs every 'urgent' interval)
      yield* TestClock.adjust(Duration.seconds(15))
      yield* Effect.yieldNow()

      // Let's spy on the publish event by subscribing
      const stream = store.subscribe(key)
      const fiber = yield* stream.pipe(
        Stream.take(1),
        Stream.runCollect,
        Effect.fork
      )

      // Advance time enough for a poll cycle
      yield* TestClock.adjust(Duration.seconds(60))

      // If polling is working, it should publish results to the store
      const results = yield* Fiber.join(fiber)
      expect(Chunk.toReadonlyArray(results).length).toBe(1)

      // Remove client
      yield* store.removeClient(key)
      yield* TestClock.adjust(Duration.seconds(15)) // Wait for manager to stop it
    })

    await Effect.runPromise(program.pipe(
      Effect.provide(makeTestLayer([mockArrival])),
      Effect.provide(TestContext.TestContext)
    ))
  })
})
