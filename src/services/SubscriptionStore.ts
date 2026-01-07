import { Effect, PubSub, Ref, Stream } from "effect"
import type { Subscription } from "../domain.js"

export interface SubscriptionKey {
  readonly routeId: string
  readonly directionId: string
  readonly stopId: string
}

export const keyToString = (key: SubscriptionKey): string => `${key.routeId}:${key.directionId}:${key.stopId}`

export const stringToKey = (str: string): SubscriptionKey | undefined => {
  const parts = str.split(":")
  if (parts.length !== 3) return undefined
  return { routeId: parts[0], directionId: parts[1], stopId: parts[2] }
}

interface State {
  readonly subscriptions: Map<string, Subscription>
  readonly subscriberCounts: Map<string, number>
}

export class SubscriptionStore extends Effect.Service<SubscriptionStore>()("SubscriptionStore", {
  effect: Effect.gen(function*() {
    const state = yield* Ref.make<State>({
      subscriptions: new Map(),
      subscriberCounts: new Map()
    })

    // PubSub for broadcasting updates to subscribers
    // Keyed by subscription string
    const hub = yield* PubSub.unbounded<{ key: string; payload: any }>()

    return {
      // Registers the subscription metadata (if not already present) and increments subscriber count
      // Returns true if this is a new active key (count went 0 -> 1)
      addClient: (subscription: Subscription) =>
        Effect.gen(function*() {
          const key = keyToString({
            routeId: subscription.routeId,
            directionId: subscription.directionId,
            stopId: subscription.stopId
          })

          let isNew = false

          yield* Ref.update(state, (prev) => {
            const nextSubs = new Map(prev.subscriptions)
            // Always update latest metadata
            nextSubs.set(key, subscription)

            const nextCounts = new Map(prev.subscriberCounts)
            const currentCount = nextCounts.get(key) || 0
            nextCounts.set(key, currentCount + 1)

            if (currentCount === 0) {
              isNew = true
            }

            return { subscriptions: nextSubs, subscriberCounts: nextCounts }
          })

          yield* Effect.logDebug(`Client added for ${key}. New? ${isNew}`)
          return { key, isNew }
        }),

      // Decrements subscriber count. Returns true if key is no longer active (count went -> 0)
      removeClient: (key: string) =>
        Effect.gen(function*() {
          let isEmpty = false

          yield* Ref.update(state, (prev) => {
            const nextCounts = new Map(prev.subscriberCounts)
            const currentCount = nextCounts.get(key) || 0

            if (currentCount > 0) {
              const newCount = currentCount - 1
              nextCounts.set(key, newCount)
              if (newCount === 0) {
                isEmpty = true
                // We keep the subscription metadata in `subscriptions` even if count is 0
                // Or we could clean it up. Let's keep it simple.
              }
            }

            return { ...prev, subscriberCounts: nextCounts }
          })

          yield* Effect.logDebug(`Client removed for ${key}. Empty? ${isEmpty}`)
          return isEmpty
        }),

      // Returns a stream of updates for a specific subscription key
      subscribe: (key: string) =>
        Stream.fromPubSub(hub).pipe(
          Stream.filter((msg) => msg.key === key),
          Stream.map((msg) => msg.payload)
        ),

      publish: (key: string, payload: any) => hub.publish({ key, payload }),

      getActiveKeys: Effect.gen(function*() {
        const s = yield* Ref.get(state)
        const active = []
        for (const [key, count] of s.subscriberCounts.entries()) {
          if (count > 0) active.push(key)
        }
        return active
      }),

      getSubscription: (key: string) =>
        Effect.gen(function*() {
          return (yield* Ref.get(state)).subscriptions.get(key)
        })
    }
  }),
  dependencies: []
}) {}
