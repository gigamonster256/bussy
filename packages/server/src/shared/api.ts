/**
 * Shared API types for frontend-backend communication.
 * These types define the contract for all REST endpoints.
 */

import type { Arrival, Direction, Route, Stop } from "../domain.ts"

// ============================================================================
// Device Management
// ============================================================================

/** Request to register a new device */
export interface RegisterDeviceRequest {
  /** Client-generated device ID (UUID) */
  readonly deviceId: string
}

/** Response from device registration */
export interface RegisterDeviceResponse {
  readonly deviceId: string
  readonly createdAt: string // ISO 8601
}

// ============================================================================
// Subscriptions
// ============================================================================

/** Request to create a new subscription (deviceId comes from URL path) */
export interface CreateSubscriptionRequest {
  readonly routeId: string
  readonly directionId: string
  readonly stopId: string
  readonly notifyMinutes: number
  readonly timeRangeStart: string // "HH:mm" 24h format
  readonly timeRangeEnd: string // "HH:mm" 24h format
}

/** Stored subscription with server-generated ID */
export interface SubscriptionResponse {
  readonly id: string
  readonly deviceId: string
  readonly routeId: string
  readonly directionId: string
  readonly stopId: string
  readonly notifyMinutes: number
  readonly timeRangeStart: string
  readonly timeRangeEnd: string
  readonly routeName: string
  readonly directionName: string
  readonly stopName: string
  readonly createdAt: string // ISO 8601
}

/** List of subscriptions response */
export type SubscriptionsListResponse = ReadonlyArray<SubscriptionResponse>

// ============================================================================
// Arrivals (Polling)
// ============================================================================

/** Request to get arrivals for subscriptions */
export interface GetArrivalsRequest {
  /** Comma-separated subscription IDs */
  readonly subscriptionIds: string
}

/** JSON-serializable arrival (DateTime converted to ISO string) */
export interface ArrivalResponse {
  readonly routeId: string
  readonly directionId: string
  readonly stopCode: string
  readonly estimatedDepartTimeUtc: string | null // ISO 8601
  readonly scheduledDepartTimeUtc: string | null // ISO 8601
  readonly isRealtime: boolean
  readonly isOffRoute: boolean
}

/** Arrivals grouped by subscription */
export interface GetArrivalsResponse {
  readonly arrivals: Record<string, ReadonlyArray<ArrivalResponse>>
}

// ============================================================================
// Push Notifications
// ============================================================================

/** Web Push subscription data (from browser PushSubscription) */
export interface PushSubscriptionData {
  readonly endpoint: string
  readonly keys: {
    readonly p256dh: string
    readonly auth: string
  }
}

/** Request to register push subscription (deviceId comes from URL path) */
export interface RegisterPushRequest {
  readonly subscription: PushSubscriptionData
}

/** VAPID public key response */
export interface VapidKeyResponse {
  readonly publicKey: string
}

// ============================================================================
// Metadata (Read-only)
// ============================================================================

/** Routes list response - re-exports domain type for convenience */
export type RoutesResponse = ReadonlyArray<Route>

/** Directions list response */
export type DirectionsResponse = ReadonlyArray<Direction>

/** Stops list response */
export type StopsResponse = ReadonlyArray<Stop>

// ============================================================================
// Error Responses
// ============================================================================

export interface ApiErrorResponse {
  readonly error: string
  readonly message: string
  readonly statusCode: number
}

// ============================================================================
// Helper to convert domain Arrival to ArrivalResponse
// ============================================================================

export const arrivalToResponse = (arrival: Arrival): ArrivalResponse => ({
  routeId: arrival.routeId,
  directionId: arrival.directionId,
  stopCode: arrival.stopCode,
  estimatedDepartTimeUtc: arrival.estimatedDepartTimeUtc
    ? new Date(Number(arrival.estimatedDepartTimeUtc.epochMillis)).toISOString()
    : null,
  scheduledDepartTimeUtc: arrival.scheduledDepartTimeUtc
    ? new Date(Number(arrival.scheduledDepartTimeUtc.epochMillis)).toISOString()
    : null,
  isRealtime: arrival.isRealtime,
  isOffRoute: arrival.isOffRoute
})