import { Config, Duration, Effect, Fiber, Ref, Schedule } from "effect"
import { AggieSpiritApi } from "./AggieSpiritApi.js"
import { stringToKey, SubscriptionStore } from "./SubscriptionStore.js"

export class PollingOrchestrator extends Effect.Service<PollingOrchestrator>()("PollingOrchestrator", {
  effect: Effect.gen(function*() {
    const api = yield* AggieSpiritApi
    const store = yield* SubscriptionStore

    // Track running polling fibers by key
    const fibers = yield* Ref.make(new Map<string, Fiber.RuntimeFiber<void>>())

    // Define the polling logic for a single subscription key
    const pollKey = (keyString: string) =>
      Effect.gen(function*() {
        const key = stringToKey(keyString)
        if (!key) return

        // Polling loop
        const loop = Effect.gen(function*() {
          // Fetch arrivals
          const arrivals = yield* api.getNextDepartureTimes(key.routeId, [key.directionId], key.stopId)

          // Find next arrival time for scheduling
          let minDiffSeconds = Infinity
          const now = Date.now()

          // Process arrivals and notify
          for (const arrival of arrivals) {
            const target = arrival.estimatedDepartTimeUtc || arrival.scheduledDepartTimeUtc
            if (target) {
              const diff = (target.epochMillis - now) / 1000
              if (diff >= 0 && diff < minDiffSeconds) {
                minDiffSeconds = diff
              }
            }

            const sub = yield* store.getSubscription(keyString)
            if (sub) {
              // const should = yield* notification.shouldNotify(arrival, sub)
              // if (should) {
              //   // Logic for notification side-effects (future)
              // }
            }
          }

          // Publish to subscribers
          yield* store.publish(keyString, arrivals)

          // Determine next poll interval
          let delay = yield* Config.duration("POLLING_LAZY_INTERVAL")
          const minutes = minDiffSeconds / 60

          if (minDiffSeconds === Infinity) {
            delay = yield* Config.duration("POLLING_LAZY_INTERVAL")
          } else if (minutes < 5) {
            delay = yield* Config.duration("POLLING_URGENT_INTERVAL")
          } else if (minutes < 15) {
            delay = yield* Config.duration("POLLING_SOON_INTERVAL")
          } else {
            delay = yield* Config.duration("POLLING_FREQUENT_INTERVAL")
          }

          yield* Effect.logDebug(
            `Polled ${keyString}. Next arrival in ${minDiffSeconds.toFixed(1)}s. Sleep ${Duration.toMillis(delay)}ms`
          )
          return delay
        })

        // Run loop with dynamic schedule
        const runLoop = (): Effect.Effect<void> =>
          Effect.gen(function*() {
            const delay = yield* loop.pipe(
              Effect.catchAll((e) => {
                return Effect.logError(`Polling error for ${keyString}: ${e}`).pipe(
                  // TODO: pull from config (need yield* Config here)
                  Effect.as(Duration.seconds(30))
                )
              })
            )

            yield* Effect.sleep(delay)
            yield* runLoop()
          })

        yield* runLoop()
      })

    // Trigger an immediate poll for a specific key (for SSE initial data)
    const triggerPoll = (keyString: string) =>
      Effect.gen(function*() {
        const key = stringToKey(keyString)
        if (!key) return

        const arrivals = yield* api.getNextDepartureTimes(key.routeId, [key.directionId], key.stopId)
        yield* store.publish(keyString, arrivals)
        yield* Effect.logDebug(`Triggered immediate poll for ${keyString}`)
      }).pipe(
        Effect.catchAll((e) => {
          return Effect.logError(`Trigger poll error for ${keyString}: ${e}`)
        })
      )

    // Manager loop to reconcile active keys
    const manager = Effect.gen(function*() {
      const activeKeys = yield* store.getActiveKeys

      const currentFibers = yield* Ref.get(fibers)
      const currentKeys = new Set(currentFibers.keys())
      const targetKeys = new Set(activeKeys)

      // Keys to remove
      for (const key of currentKeys) {
        if (!targetKeys.has(key)) {
          const fiber = currentFibers.get(key)!
          yield* Fiber.interrupt(fiber)
          currentFibers.delete(key)
          yield* Effect.logInfo(`Stopped polling for ${key}`)
        }
      }

      // Keys to add
      for (const key of targetKeys) {
        if (!currentKeys.has(key)) {
          const fiber = yield* Effect.forkDaemon(pollKey(key))
          currentFibers.set(key, fiber)
          yield* Effect.logInfo(`Started polling for ${key}`)
        }
      }

      // Update ref
      yield* Ref.set(fibers, currentFibers)
    }).pipe(
      // Run manager periodically
      Effect.repeat(Schedule.spaced(yield* Config.duration("POLLING_URGENT_INTERVAL")))
    )

    // Start manager
    yield* Effect.forkDaemon(manager)

    return { triggerPoll }
  }),
  dependencies: [AggieSpiritApi.Default, SubscriptionStore.Default]
}) {}
