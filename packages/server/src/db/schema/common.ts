/**
 * Database record types.
 * These types represent the shape of data stored in the database.
 */

/**
 * Device record - represents a client device with optional push notification settings
 */
export interface Device {
  id: string
  pushEndpoint: string | null
  pushP256dh: string | null
  pushAuth: string | null
  createdAt: Date
  lastSeenAt: Date
}

/**
 * Subscription record - represents a user's notification preference for a route/stop
 * Human-readable names are resolved at runtime via NameResolver service
 */
export interface Subscription {
  id: string
  deviceId: string
  routeId: string
  directionId: string
  stopId: string
  notifyMinutes: number
  timeRangeStart: string
  timeRangeEnd: string
  createdAt: Date
  updatedAt: Date
}
