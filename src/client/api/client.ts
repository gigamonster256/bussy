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
} from "../../shared/api.ts"

const BASE_URL = "/api/v1"

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
  registerDevice: (deviceId: string): Promise<RegisterDeviceResponse> =>
    fetchJson("/devices", {
      method: "POST",
      body: JSON.stringify({ deviceId })
    }),

  /**
   * Delete device and all associated data
   */
  deleteDevice: (deviceId: string): Promise<{ success: boolean }> =>
    fetchJson(`/devices/${encodeURIComponent(deviceId)}`, {
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
  getDirections: (routeId: string): Promise<DirectionsResponse> =>
    fetchJson(`/routes/${encodeURIComponent(routeId)}/directions`),

  /**
   * Get stops for a route/direction
   */
  getStops: (routeId: string, directionId: string): Promise<StopsResponse> =>
    fetchJson(`/routes/${encodeURIComponent(routeId)}/directions/${encodeURIComponent(directionId)}/stops`),

  // ============================================================================
  // Subscriptions CRUD
  // ============================================================================

  /**
   * Get all subscriptions for a device
   */
  getSubscriptions: (deviceId: string): Promise<SubscriptionsListResponse> =>
    fetchJson(`/devices/${encodeURIComponent(deviceId)}/subscriptions`),

  /**
   * Create a new subscription
   */
  createSubscription: (deviceId: string, subscription: CreateSubscriptionRequest): Promise<SubscriptionResponse> =>
    fetchJson(`/devices/${encodeURIComponent(deviceId)}/subscriptions`, {
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
    routeId: string,
    directionId: string,
    stopCode: string
  ): Promise<Array<ArrivalResponse>> =>
    fetchJson(
      `/routes/${encodeURIComponent(routeId)}/directions/${encodeURIComponent(directionId)}/stops/${
        encodeURIComponent(stopCode)
      }/arrivals`
    ),

  /**
   * Batch arrivals - get arrivals for all device subscriptions
   */
  getArrivalsBatch: (deviceId: string): Promise<GetArrivalsResponse> =>
    fetchJson(`/devices/${encodeURIComponent(deviceId)}/arrivals`),

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
  registerPushSubscription: (deviceId: string, subscription: PushSubscriptionData): Promise<{ success: boolean }> =>
    fetchJson(`/devices/${encodeURIComponent(deviceId)}/push`, {
      method: "POST",
      body: JSON.stringify({ subscription })
    }),

  /**
   * Unregister push subscription
   */
  unregisterPushSubscription: (deviceId: string): Promise<{ success: boolean }> =>
    fetchJson(`/devices/${encodeURIComponent(deviceId)}/push`, {
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
