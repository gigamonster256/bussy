import { Chunk, Effect, Fiber, Stream } from "effect"
import { describe, expect, it } from "vitest"
import type { Subscription } from "../src/domain.js"
import { keyToString, SubscriptionStore } from "../src/services/SubscriptionStore.js"

const mockSub: Subscription = {
  routeId: "01",
  directionId: "d1",
  stopId: "s1",
  notifyMinutes: 5,
  timeRangeStart: "08:00",
  timeRangeEnd: "17:00",
  routeName: "R1",
  directionName: "D1",
  stopName: "S1"
}

const mockKey = keyToString(mockSub)

describe("SubscriptionStore", () => {
  it("should track clients and active keys", async () => {
    const program = Effect.gen(function*() {
      const store = yield* SubscriptionStore

      // Add first client
      const res1 = yield* store.addClient(mockSub)
      expect(res1.key).toBe(mockKey)
      expect(res1.isNew).toBe(true)

      const active1 = yield* store.getActiveKeys
      expect(active1).toEqual([mockKey])

      // Add second client
      const res2 = yield* store.addClient(mockSub)
      expect(res2.isNew).toBe(false) // Not new anymore

      const active2 = yield* store.getActiveKeys
      expect(active2).toEqual([mockKey])

      // Remove one client
      const empty1 = yield* store.removeClient(mockKey)
      expect(empty1).toBe(false) // Still one remaining

      // Remove last client
      const empty2 = yield* store.removeClient(mockKey)
      expect(empty2).toBe(true) // Now empty

      const active3 = yield* store.getActiveKeys
      expect(active3).toEqual([])
    })

    await Effect.runPromise(program.pipe(Effect.provide(SubscriptionStore.Default)))
  })

  it("should publish and receive updates", async () => {
    const program = Effect.gen(function*() {
      const store = yield* SubscriptionStore

      // Subscribe stream
      const stream = store.subscribe(mockKey)

      // Fork stream collection
      const fiber = yield* Stream.take(stream, 2).pipe(
        Stream.runCollect,
        Effect.fork
      )

      // Yield to let the stream subscription establish
      yield* Effect.sleep("10 millis")

      // Publish updates
      yield* store.publish(mockKey, "update1")
      yield* store.publish("otherKey", "ignored")
      yield* store.publish(mockKey, "update2")

      const result = yield* Fiber.join(fiber)
      expect(Chunk.toReadonlyArray(result)).toEqual(["update1", "update2"])
    })

    await Effect.runPromise(program.pipe(Effect.provide(SubscriptionStore.Default)))
  })
})
