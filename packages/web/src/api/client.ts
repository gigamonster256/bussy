/**
 * Typed API client for frontend-backend communication.
 * All methods return typed responses based on shared/api.ts types.
 */
import type {
  ArrivalResponse,
  CreateSubscriptionRequest,
  DirectionsResponse,
  GetArrivalsResponse,
  PushSubscriptionData,
  RegisterDeviceResponse,
  RoutesResponse,
  StopsResponse,
  SubscriptionResponse,
  SubscriptionsListResponse,
  VapidKeyResponse
} from "server/src/shared/api"

const BASE_URL = "http://localhost:3000/api/v1"

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API Error ${response.status}: ${error}`)
  }

  return response.json()
}

export const api = {
  // ============================================================================
  // Device Registration
  // ============================================================================

  /**
   * Register device with the server
   */
  registerDevice: (deviceID: string): Promise<RegisterDeviceResponse> =>
    fetchJson("/devices", {
      method: "POST",
      body: JSON.stringify({ deviceID })
    }),

  /**
   * Delete device and all associated data
   */
  deleteDevice: (deviceID: string): Promise<{ success: boolean }> =>
    fetchJson(`/devices/${encodeURIComponent(deviceID)}`, {
      method: "DELETE"
    }),

  // ============================================================================
  // Metadata
  // ============================================================================

  /**
   * Get all available routes
   */
  getRoutes: (): Promise<RoutesResponse> => fetchJson("/routes"),

  /**
   * Get directions for a route
   */
  getDirections: (routeID: string): Promise<DirectionsResponse> =>
    fetchJson(`/routes/${encodeURIComponent(routeID)}/directions`),

  /**
   * Get stops for a route/direction
   */
  getStops: (routeID: string, directionID: string): Promise<StopsResponse> =>
    fetchJson(`/routes/${encodeURIComponent(routeID)}/directions/${encodeURIComponent(directionID)}/stops`),

  // ============================================================================
  // Subscriptions CRUD
  // ============================================================================

  /**
   * Get all subscriptions for a device
   */
  getSubscriptions: (deviceID: string): Promise<SubscriptionsListResponse> =>
    fetchJson(`/devices/${encodeURIComponent(deviceID)}/subscriptions`),

  /**
   * Create a new subscription
   */
  createSubscription: (deviceID: string, subscription: CreateSubscriptionRequest): Promise<SubscriptionResponse> =>
    fetchJson(`/devices/${encodeURIComponent(deviceID)}/subscriptions`, {
      method: "POST",
      body: JSON.stringify(subscription)
    }),

  /**
   * Get a single subscription
   */
  getSubscription: (id: string): Promise<SubscriptionResponse> => fetchJson(`/subscriptions/${encodeURIComponent(id)}`),

  /**
   * Delete a subscription
   */
  deleteSubscription: (id: string): Promise<{ success: boolean }> =>
    fetchJson(`/subscriptions/${encodeURIComponent(id)}`, {
      method: "DELETE"
    }),

  // ============================================================================
  // Arrivals
  // ============================================================================

  /**
   * Get arrivals for a specific stop
   */
  getArrivals: (
    routeID: string,
    directionID: string,
    stopCode: string
  ): Promise<Array<ArrivalResponse>> =>
    fetchJson(
      `/routes/${encodeURIComponent(routeID)}/directions/${encodeURIComponent(directionID)}/stops/${
        encodeURIComponent(stopCode)
      }/arrivals`
    ),

  /**
   * Batch arrivals - get arrivals for all device subscriptions
   */
  getArrivalsBatch: (deviceID: string): Promise<GetArrivalsResponse> =>
    fetchJson(`/devices/${encodeURIComponent(deviceID)}/arrivals`),

  // ============================================================================
  // Push Notifications
  // ============================================================================

  /**
   * Get VAPID public key for push subscription
   */
  getVapidPublicKey: (): Promise<VapidKeyResponse> => fetchJson("/push/vapid-key"),

  /**
   * Register push subscription with server
   */
  registerPushSubscription: (deviceID: string, subscription: PushSubscriptionData): Promise<{ success: boolean }> =>
    fetchJson(`/devices/${encodeURIComponent(deviceID)}/push`, {
      method: "POST",
      body: JSON.stringify({ subscription })
    }),

  /**
   * Unregister push subscription
   */
  unregisterPushSubscription: (deviceID: string): Promise<{ success: boolean }> =>
    fetchJson(`/devices/${encodeURIComponent(deviceID)}/push`, {
      method: "DELETE"
    }),

  // ============================================================================
  // Health
  // ============================================================================

  /**
   * Health check
   */
  health: (): Promise<{ status: string }> => fetchJson("/health")
}
