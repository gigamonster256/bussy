import { createSignal, For, onCleanup, onMount, Show } from "solid-js"
import type { ArrivalResponse, SubscriptionResponse } from "server/src/shared/api"
import { api } from "./api/client.ts"
import { AddSubscriptionForm } from "./components/AddSubscriptionForm.tsx"
import { SubscriptionCard } from "./components/SubscriptionCard.tsx"
import { Toggle } from "./components/Toggle.tsx"
import { clearDeviceId, getOrCreateDeviceId } from "./stores/device.ts"
import { isDevMode, toggleDevMode } from "./stores/devMode.ts"
import { getLiveUpdatesPreference, setLiveUpdatesPreference } from "./stores/liveUpdates.ts"
import {
  isPushSubscribed,
  isPushSupported,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush
} from "./stores/push.ts"
import { setSubscriptionOrder, sortByOrder } from "./stores/subscriptionOrder.ts"

export default function App() {
  const [deviceId] = createSignal(getOrCreateDeviceId())
  const [devMode, setDevModeState] = createSignal(isDevMode())
  const [subscriptions, setSubscriptions] = createSignal<Array<SubscriptionResponse>>([])
  const [allArrivals, setAllArrivals] = createSignal<Record<string, Array<ArrivalResponse>>>({})
  const [isPolling, setIsPolling] = createSignal(false)
  const [pushSupported, setPushSupported] = createSignal(false)
  const [pushEnabled, setPushEnabled] = createSignal(false)
  const [pushLoading, setPushLoading] = createSignal(false)
  const [logs, setLogs] = createSignal<Array<string>>([])
  const [draggingId, setDraggingId] = createSignal<string | null>(null)
  const [isOverTrash, setIsOverTrash] = createSignal(false)
  const [resetConfirmStep, setResetConfirmStep] = createSignal(0) // 0=none, 1=first confirm, 2=resetting
  const [resetError, setResetError] = createSignal<string | null>(null)

  let pollInterval: ReturnType<typeof setInterval> | null = null

  // Save subscription order whenever it changes
  function updateSubscriptionsAndSaveOrder(newSubs: Array<SubscriptionResponse>) {
    setSubscriptions(newSubs)
    setSubscriptionOrder(newSubs.map((s) => s.id))
  }

  function log(msg: string) {
    setLogs((prev) => [`${new Date().toLocaleTimeString()}: ${msg}`, ...prev.slice(0, 49)])
  }

  async function pollAllArrivals() {
    if (subscriptions().length === 0) return
    try {
      const response = await api.getArrivalsBatch(deviceId())
      const mutableArrivals: Record<string, Array<ArrivalResponse>> = {}
      for (const [key, value] of Object.entries(response.arrivals)) {
        // mutableArrivals[key] = [...value]
      }
      setAllArrivals(mutableArrivals)
      // const totalArrivals = Object.values(response.arrivals).reduce((sum, arr) => sum + arr.length, 0)
      // log(`Updated: ${totalArrivals} arrivals`)
    } catch (e) {
      log(`Polling error: ${e}`)
    }
  }

  function startPolling() {
    if (isPolling() || subscriptions().length === 0) return
    setIsPolling(true)
    setLiveUpdatesPreference(true)
    pollAllArrivals()
    pollInterval = setInterval(pollAllArrivals, 30_000)
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    setIsPolling(false)
    setLiveUpdatesPreference(false)
    setAllArrivals({})
  }

  onMount(async () => {
    try {
      await api.registerDevice(deviceId())
      setPushSupported(isPushSupported())
      if (isPushSupported()) {
        await registerServiceWorker()
        const subscribed = await isPushSubscribed()
        setPushEnabled(subscribed)
      }
      const subs = await api.getSubscriptions(deviceId())
      // Sort by saved order
      setSubscriptions(sortByOrder(subs as Array<SubscriptionResponse>))
      if (subs.length > 0 && getLiveUpdatesPreference()) {
        startPolling()
      }
    } catch (e) {
      log(`Error initializing: ${e}`)
    }
  })

  onCleanup(() => {
    if (pollInterval) clearInterval(pollInterval)
  })

  async function togglePush(enabled: boolean) {
    if (pushLoading()) return
    setPushLoading(true)
    try {
      if (!enabled) {
        const result = await unsubscribeFromPush(deviceId())
        if (result.success) setPushEnabled(false)
      } else {
        const result = await subscribeToPush(deviceId())
        if (result.success) setPushEnabled(true)
      }
    } finally {
      setPushLoading(false)
    }
  }

  async function deleteSubscription(id: string) {
    try {
      await api.deleteSubscription(id)
      setSubscriptions((prev) => prev.filter((s) => s.id !== id))
      setAllArrivals((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      if (subscriptions().length === 0) stopPolling()
    } catch (e) {
      log(`Error deleting: ${e}`)
    }
  }

  function handleSubscriptionCreated(sub: SubscriptionResponse) {
    setSubscriptions((prev) => [...prev, sub])
    if (!isPolling()) {
      startPolling()
    } else {
      pollAllArrivals()
    }
  }

  function handleDevModeToggle() {
    setDevModeState(toggleDevMode())
  }

  async function handleResetAccount() {
    if (resetConfirmStep() === 0) {
      // First click - show confirmation
      setResetConfirmStep(1)
      setResetError(null)
      return
    }

    if (resetConfirmStep() === 1) {
      // Second click - actually reset
      setResetConfirmStep(2)
      setResetError(null)

      try {
        // Stop polling
        stopPolling()

        // Delete device from server
        await api.deleteDevice(deviceId())

        // Clear local storage
        clearDeviceId()

        log("Account reset successfully. Reloading...")

        // Reload the page to get a fresh device ID
        window.location.reload()
      } catch (e) {
        setResetError(`Failed to reset: ${e}`)
        setResetConfirmStep(0)
        log(`Reset error: ${e}`)
      }
    }
  }

  function cancelReset() {
    setResetConfirmStep(0)
    setResetError(null)
  }

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header class="bg-maroon-700 text-white pt-safe">
        <div class="py-4 px-4 shadow-lg">
          <div class="max-w-lg mx-auto">
            <h1 class="text-xl font-bold text-center">Bussy</h1>
            <Show when={devMode()}>
              <p class="text-center text-maroon-200 text-xs mt-0.5">
                Device: {deviceId()}
              </p>
            </Show>
          </div>
        </div>
      </header>

      <main class="max-w-lg mx-auto px-4 py-4 space-y-4 flex-1 w-full">
        {/* Push Notifications */}
        <Show when={pushSupported()}>
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-gray-900">Push Notifications</p>
                <p class="text-xs text-gray-500">Get notified when your bus is arriving</p>
              </div>
              <Toggle checked={pushEnabled()} onChange={togglePush} disabled={pushLoading()} />
            </div>
          </div>
        </Show>

        {/* Live Updates Status */}
        <Show when={subscriptions().length > 0}>
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div
                  class={`w-2 h-2 rounded-full ${isPolling() ? "bg-green-500 animate-pulse-dot" : "bg-gray-300"}`}
                />
                <span class="text-sm text-gray-700">
                  {isPolling() ? "Live updates" : "Live updates paused"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => (isPolling() ? stopPolling() : startPolling())}
                class={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  isPolling()
                    ? "text-gray-600 bg-gray-100 hover:bg-gray-200"
                    : "text-white bg-maroon-700 hover:bg-maroon-600"
                }`}
              >
                {isPolling() ? "Pause" : "Resume"}
              </button>
            </div>
          </div>
        </Show>

        {/* Subscriptions */}
        <section>
          <h2 class="text-sm font-semibold text-gray-900 mb-2">My Subscriptions</h2>
          <Show
            when={subscriptions().length > 0}
            fallback={<p class="text-sm text-gray-500">No subscriptions yet. Add one below!</p>}
          >
            <div class="relative">
              {/* Subscription list */}
              <div
                class={`space-y-3 transition-all duration-200 ${draggingId() ? "pr-24" : ""}`}
              >
                <For each={subscriptions()}>
                  {(sub, index) => (
                    <SubscriptionCard
                      subscription={sub}
                      arrivals={allArrivals()[sub.id] || []}
                      isPolling={isPolling()}
                      isDragging={draggingId() === sub.id}
                      index={index()}
                      dragIndex={draggingId() ? subscriptions().findIndex((s) => s.id === draggingId()) : null}
                      onDelete={deleteSubscription}
                      onDragStart={setDraggingId}
                      onDragEnd={() => {
                        setDraggingId(null)
                        setIsOverTrash(false)
                      }}
                      onDrop={(targetId, position) => {
                        const dragId = draggingId()
                        if (!dragId || dragId === targetId) return

                        const prev = subscriptions()
                        const items = [...prev]
                        const dragIndex = items.findIndex((s) => s.id === dragId)
                        const targetIndex = items.findIndex((s) => s.id === targetId)
                        if (dragIndex === -1 || targetIndex === -1) return

                        // Remove dragged item
                        const [draggedItem] = items.splice(dragIndex, 1)
                        // Calculate new position
                        let insertIndex = targetIndex
                        if (position === "below") insertIndex++
                        // Adjust if we removed from before the target
                        if (dragIndex < targetIndex) insertIndex--
                        // Insert at new position
                        items.splice(insertIndex, 0, draggedItem)
                        // Update and persist order
                        updateSubscriptionsAndSaveOrder(items)
                      }}
                    />
                  )}
                </For>
              </div>

              {/* Trash drop zone - absolutely positioned on the right */}
              <div
                class={`absolute top-0 bottom-0 right-0 flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 ${
                  draggingId()
                    ? "w-20 opacity-100"
                    : "w-0 opacity-0 overflow-hidden border-0"
                } ${
                  isOverTrash()
                    ? "border-red-500 bg-red-50 text-red-600"
                    : "border-gray-300 bg-gray-50 text-gray-400"
                }`}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (e.dataTransfer) e.dataTransfer.dropEffect = "move"
                  setIsOverTrash(true)
                }}
                onDragLeave={() => setIsOverTrash(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  const id = draggingId()
                  if (id) {
                    deleteSubscription(id)
                  }
                  setDraggingId(null)
                  setIsOverTrash(false)
                }}
              >
                <svg
                  class={`w-8 h-8 transition-transform duration-200 ${isOverTrash() ? "scale-110" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span class="text-xs mt-1 font-medium">Delete</span>
              </div>
            </div>
          </Show>
        </section>

        {/* Add Form */}
        <AddSubscriptionForm
          deviceId={deviceId()}
          onSubscriptionCreated={handleSubscriptionCreated}
          onLog={log}
        />

        {/* Dev Mode Section */}
        <Show when={devMode()}>
          {/* Activity Log */}
          <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 class="text-sm font-semibold text-gray-900 mb-2">Activity Log</h2>
            <div class="bg-gray-900 rounded-lg p-2 max-h-32 overflow-y-auto font-mono text-xs">
              <For each={logs()}>
                {(msg) => <div class="text-green-400 py-0.5">{msg}</div>}
              </For>
              <Show when={logs().length === 0}>
                <div class="text-gray-500 italic">No activity yet</div>
              </Show>
            </div>
          </section>

          {/* Reset Account */}
          <section class="bg-white rounded-xl shadow-sm border border-red-200 p-4">
            <h2 class="text-sm font-semibold text-red-700 mb-2">Danger Zone</h2>
            <p class="text-xs text-gray-600 mb-3">
              Reset your account to delete all subscriptions and get a new device ID. This action cannot be undone.
            </p>

            <Show when={resetError()}>
              <div class="text-xs text-red-600 mb-2 p-2 bg-red-50 rounded">
                {resetError()}
              </div>
            </Show>

            <Show
              when={resetConfirmStep() === 0}
              fallback={
                <div class="flex gap-2">
                  <button
                    type="button"
                    onClick={handleResetAccount}
                    disabled={resetConfirmStep() === 2}
                    class="flex-1 py-2 px-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {resetConfirmStep() === 2 ? "Resetting..." : "Yes, Reset Everything"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelReset}
                    disabled={resetConfirmStep() === 2}
                    class="py-2 px-4 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              }
            >
              <button
                type="button"
                onClick={handleResetAccount}
                class="w-full py-2 px-4 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 focus:ring-2 focus:ring-offset-2 focus:ring-red-600 transition-colors text-sm"
              >
                Reset Account
              </button>
            </Show>
          </section>
        </Show>
      </main>

      {/* Footer */}
      <footer class="max-w-lg mx-auto px-4 py-4 pb-safe mt-auto w-full">
        <div class="flex items-center justify-between text-xs text-gray-400">
          <span>Bussy</span>
          <span onClick={handleDevModeToggle} class="cursor-pointer select-none">
            v{APP_VERSION}{devMode() ? "-dev" : ""}
          </span>
        </div>
      </footer>
    </div>
  )
}
