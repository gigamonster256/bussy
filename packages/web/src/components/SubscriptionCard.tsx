import { createSignal, For, Show } from "solid-js"
import type { ArrivalResponse, SubscriptionResponse } from "server/src/shared/api"

interface SubscriptionCardProps {
  subscription: SubscriptionResponse
  arrivals: Array<ArrivalResponse>
  isPolling: boolean
  isDragging: boolean
  index: number
  dragIndex: number | null
  onDelete: (id: string) => void
  onDragStart?: (id: string) => void
  onDragEnd?: () => void
  onDrop?: (targetId: string, position: "above" | "below") => void
}

function formatArrival(arrival: ArrivalResponse) {
  const time = arrival.estimatedDepartTimeUtc || arrival.scheduledDepartTimeUtc
  if (!time) return { timeStr: "Unknown", minsAway: 0, isRealtime: arrival.isRealtime }

  const date = new Date(time)
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const diffMs = date.getTime() - Date.now()
  const minsAway = Math.round(diffMs / 60000)

  return { timeStr, minsAway, isRealtime: arrival.isRealtime }
}

export function SubscriptionCard(props: SubscriptionCardProps) {
  const sub = () => props.subscription
  const [dropPosition, setDropPosition] = createSignal<"above" | "below" | null>(null)

  // Check if dropping at this position would actually move the item
  const wouldMove = (position: "above" | "below"): boolean => {
    const dragIdx = props.dragIndex
    if (dragIdx === null) return false

    const targetIdx = props.index

    // Dropping above: would insert at targetIdx
    // If dragging from targetIdx or targetIdx-1, no movement
    if (position === "above") {
      return dragIdx !== targetIdx && dragIdx !== targetIdx - 1
    }
    // Dropping below: would insert at targetIdx+1
    // If dragging from targetIdx or targetIdx+1, no movement
    return dragIdx !== targetIdx && dragIdx !== targetIdx + 1
  }

  // Only show drop indicator if it would result in movement
  const showDropIndicator = (position: "above" | "below"): boolean => {
    return dropPosition() === position && wouldMove(position)
  }

  const handleDragStart = (e: DragEvent) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData("text/plain", sub().id)
      e.dataTransfer.effectAllowed = "move"
    }
    props.onDragStart?.(sub().id)
  }

  const handleDragEnd = () => {
    props.onDragEnd?.()
    setDropPosition(null)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move"

    // Determine if we're in the top or bottom half
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2
    setDropPosition(e.clientY < midpoint ? "above" : "below")
  }

  const handleDragLeave = () => {
    setDropPosition(null)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    const pos = dropPosition()
    if (pos && wouldMove(pos)) {
      props.onDrop?.(sub().id, pos)
    }
    setDropPosition(null)
  }

  return (
    <div class="relative">
      {/* Drop indicator - above */}
      <Show when={showDropIndicator("above")}>
        <div class="absolute -top-1.5 left-0 right-0 h-1 bg-maroon-700 rounded-full z-10" />
      </Show>

      <div
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        class={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 transition-all duration-200 hover:shadow-md hover:border-gray-300 cursor-grab active:cursor-grabbing ${
          props.isDragging ? "opacity-50" : ""
        }`}
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg bg-maroon-700 text-white text-sm font-bold flex-shrink-0">
                {sub().routeName}
              </span>
              <div class="min-w-0">
                <p class="font-medium text-gray-900 truncate">{sub().stopName}</p>
                <p class="text-sm text-gray-500 truncate">{sub().directionName}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => props.onDelete(sub().id)}
            class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
            title="Delete subscription"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>

        <p class="text-xs text-gray-400 mt-2">
          Notify {sub().notifyMinutes}min before · {sub().timeRangeStart} - {sub().timeRangeEnd}
        </p>

        <Show when={props.isPolling}>
          <div class="mt-3 pt-3 border-t border-gray-100">
            <Show
              when={props.arrivals.length > 0}
              fallback={<p class="text-sm text-gray-400 italic">No upcoming arrivals</p>}
            >
              <div class="flex flex-wrap gap-2">
                <For each={props.arrivals.slice(0, 3)}>
                  {(arrival) => {
                    const { isRealtime, minsAway, timeStr } = formatArrival(arrival)
                    return (
                      <div
                        class={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm ${
                          isRealtime
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-gray-50 text-gray-600 border border-gray-200"
                        }`}
                      >
                        <span class="font-semibold">{minsAway > 0 ? `${minsAway}m` : "Now"}</span>
                        <span class="text-xs opacity-75">{timeStr}</span>
                        {!isRealtime && <span class="text-xs bg-amber-100 text-amber-700 px-1 rounded">sched</span>}
                      </div>
                    )
                  }}
                </For>
              </div>
            </Show>
          </div>
        </Show>
      </div>

      {/* Drop indicator - below */}
      <Show when={showDropIndicator("below")}>
        <div class="absolute -bottom-1.5 left-0 right-0 h-1 bg-maroon-700 rounded-full z-10" />
      </Show>
    </div>
  )
}
