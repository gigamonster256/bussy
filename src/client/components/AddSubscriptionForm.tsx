import { createResource, createSignal, For } from "solid-js"
import { api } from "../api/client.ts"

interface AddSubscriptionFormProps {
  deviceId: string
  onSubscriptionCreated: (subscription: any) => void
  onLog: (msg: string) => void
}

export function AddSubscriptionForm(props: AddSubscriptionFormProps) {
  const [selectedRouteId, setSelectedRouteId] = createSignal<string>("")
  const [selectedDirectionId, setSelectedDirectionId] = createSignal<string>("")
  const [selectedStopCode, setSelectedStopCode] = createSignal<string>("")
  const [notifyMinutes, setNotifyMinutes] = createSignal(5)
  const [timeRangeStart, setTimeRangeStart] = createSignal("07:00")
  const [timeRangeEnd, setTimeRangeEnd] = createSignal("22:00")
  const [isCreating, setIsCreating] = createSignal(false)

  const [routes] = createResource(async () => {
    try {
      return await api.getRoutes()
    } catch (e) {
      props.onLog(`Error loading routes: ${e}`)
      return []
    }
  })

  const [directions] = createResource(selectedRouteId, async (routeId) => {
    if (!routeId) return []
    try {
      return await api.getDirections(routeId)
    } catch (e) {
      props.onLog(`Error loading directions: ${e}`)
      return []
    }
  })

  const [stops] = createResource(
    () => ({ routeId: selectedRouteId(), directionId: selectedDirectionId() }),
    async ({ directionId, routeId }) => {
      if (!routeId || !directionId) return []
      try {
        return await api.getStops(routeId, directionId)
      } catch (e) {
        props.onLog(`Error loading stops: ${e}`)
        return []
      }
    }
  )

  const selectedRoute = () => routes()?.find((r) => r.id === selectedRouteId())
  const selectedDirection = () => directions()?.find((d) => d.id === selectedDirectionId())
  const selectedStop = () => stops()?.find((s) => s.code === selectedStopCode())

  function handleRouteChange(routeId: string) {
    setSelectedRouteId(routeId)
    setSelectedDirectionId("")
    setSelectedStopCode("")
  }

  function handleDirectionChange(directionId: string) {
    setSelectedDirectionId(directionId)
    setSelectedStopCode("")
  }

  const isFormValid = () => selectedRouteId() && selectedDirectionId() && selectedStopCode()

  async function handleSubmit() {
    const route = selectedRoute()
    const direction = selectedDirection()
    const stop = selectedStop()

    if (!route || !direction || !stop) return

    setIsCreating(true)
    try {
      const sub = await api.createSubscription(props.deviceId, {
        routeId: route.id,
        directionId: direction.id,
        stopId: stop.code,
        notifyMinutes: notifyMinutes(),
        timeRangeStart: timeRangeStart(),
        timeRangeEnd: timeRangeEnd()
      })

      props.onSubscriptionCreated(sub)
      props.onLog(`Created subscription for ${route.shortName} at ${stop.name}`)

      setSelectedRouteId("")
      setSelectedDirectionId("")
      setSelectedStopCode("")
    } catch (e) {
      props.onLog(`Error creating subscription: ${e}`)
    } finally {
      setIsCreating(false)
    }
  }

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-maroon-700 focus:border-maroon-700 disabled:bg-gray-100 disabled:cursor-not-allowed"

  return (
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h2 class="text-base font-semibold text-gray-900 mb-3">Add Subscription</h2>

      <div class="space-y-3">
        <div>
          <label for="route-select" class="block text-sm font-medium text-gray-700 mb-1">
            Route
          </label>
          <select
            id="route-select"
            value={selectedRouteId()}
            onChange={(e) => handleRouteChange(e.currentTarget.value)}
            disabled={routes.loading}
            class={inputClass}
          >
            <option value="">{routes.loading ? "Loading..." : "Select a route"}</option>
            <For each={routes()}>
              {(route) => (
                <option value={route.id}>
                  {route.shortName} - {route.name}
                </option>
              )}
            </For>
          </select>
        </div>

        <div>
          <label for="direction-select" class="block text-sm font-medium text-gray-700 mb-1">
            Direction
          </label>
          <select
            id="direction-select"
            value={selectedDirectionId()}
            onChange={(e) => handleDirectionChange(e.currentTarget.value)}
            disabled={!selectedRouteId() || directions.loading}
            class={inputClass}
          >
            <option value="">
              {!selectedRouteId()
                ? "Select a route first"
                : directions.loading
                ? "Loading..."
                : "Select a direction"}
            </option>
            <For each={directions()}>
              {(dir) => <option value={dir.id}>{dir.name}</option>}
            </For>
          </select>
        </div>

        <div>
          <label for="stop-select" class="block text-sm font-medium text-gray-700 mb-1">
            Stop
          </label>
          <select
            id="stop-select"
            value={selectedStopCode()}
            onChange={(e) => setSelectedStopCode(e.currentTarget.value)}
            disabled={!selectedDirectionId() || stops.loading}
            class={inputClass}
          >
            <option value="">
              {!selectedDirectionId()
                ? "Select a direction first"
                : stops.loading
                ? "Loading..."
                : "Select a stop"}
            </option>
            <For each={stops()}>
              {(stop) => <option value={stop.code}>{stop.name}</option>}
            </For>
          </select>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div class="col-span-2 sm:col-span-1">
            <label for="notify-minutes" class="block text-sm font-medium text-gray-700 mb-1">
              Notify (min before)
            </label>
            <input
              type="number"
              id="notify-minutes"
              value={notifyMinutes()}
              onInput={(e) => setNotifyMinutes(parseInt(e.currentTarget.value) || 5)}
              min="1"
              max="60"
              class={inputClass}
            />
          </div>

          <div>
            <label for="time-start" class="block text-sm font-medium text-gray-700 mb-1">
              From
            </label>
            <input
              type="time"
              id="time-start"
              value={timeRangeStart()}
              onInput={(e) => setTimeRangeStart(e.currentTarget.value)}
              class={inputClass}
            />
          </div>

          <div>
            <label for="time-end" class="block text-sm font-medium text-gray-700 mb-1">
              Until
            </label>
            <input
              type="time"
              id="time-end"
              value={timeRangeEnd()}
              onInput={(e) => setTimeRangeEnd(e.currentTarget.value)}
              class={inputClass}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isFormValid() || isCreating()}
          class="w-full py-2.5 px-4 bg-maroon-700 text-white font-medium rounded-lg hover:bg-maroon-600 focus:ring-2 focus:ring-offset-2 focus:ring-maroon-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {isCreating() ? "Creating..." : "Add Subscription"}
        </button>
      </div>
    </div>
  )
}
