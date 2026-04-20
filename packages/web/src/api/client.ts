/**
 * API client derived from @bussy/api using Effect HttpApiClient.
 * Uses Effect patterns but exposes Promise-based functions for regular JS usage.
 */
import { FetchHttpClient, HttpApiClient } from "@effect/platform";
import { Effect } from "effect";
import { BussyApi } from "@bussy/api";

// Base URL for the API
const BASE_URL = "http://localhost:3000";

// Placeholder data generators
const generateId = () => `01HX${Math.random().toString(36).substring(2, 24).toUpperCase()}`;

// Placeholder routes
const placeholderRoutes: Array<Route> = [
  { id: "01", shortName: "01", longName: "College Main", name: "College Main", type: "Bus" },
  { id: "02", shortName: "02", longName: "Northside", name: "Northside", type: "Bus" },
  { id: "03", shortName: "03", longName: "Southside", name: "Southside", type: "Bus" },
  { id: "04", shortName: "04", longName: "Ring West", name: "Ring West", type: "Bus" },
  { id: "27", shortName: "27", longName: "Airport", name: "Airport", type: "Bus" },
];

// Placeholder directions
const placeholderDirections = [
  { id: "inbound", name: "Inbound to Campus" },
  { id: "outbound", name: "Outbound from Campus" },
];

// Placeholder stops
const placeholderStops = [
  { id: "stop-1", name: "Main Library", code: "LIB" },
  { id: "stop-2", name: "Memorial Student Center", code: "MSC" },
  { id: "stop-3", name: "Holloway", code: "HOL" },
  { id: "stop-4", name: "Zachry", code: "ZACH" },
  { id: "stop-5", name: "Bain Center", code: "BAIN" },
];

// Placeholder subscriptions
let placeholderSubscriptions: Array<SubscriptionResponse> = [];

// Placeholder arrivals
const createPlaceholderArrivals = (): Array<ArrivalResponse> => [
  {
    minutes: 3,
    delayed: false,
    departureTime: new Date(Date.now() + 3 * 60000).toISOString(),
    estimatedDepartTimeUtc: new Date(Date.now() + 3 * 60000).toISOString(),
    scheduledDepartTimeUtc: new Date(Date.now() + 5 * 60000).toISOString(),
    isRealtime: true,
  },
  {
    minutes: 12,
    delayed: false,
    departureTime: new Date(Date.now() + 12 * 60000).toISOString(),
    estimatedDepartTimeUtc: new Date(Date.now() + 12 * 60000).toISOString(),
    scheduledDepartTimeUtc: new Date(Date.now() + 15 * 60000).toISOString(),
    isRealtime: true,
  },
  {
    minutes: 25,
    delayed: true,
    departureTime: new Date(Date.now() + 30 * 60000).toISOString(),
    estimatedDepartTimeUtc: new Date(Date.now() + 30 * 60000).toISOString(),
    scheduledDepartTimeUtc: new Date(Date.now() + 25 * 60000).toISOString(),
    isRealtime: false,
  },
  {
    minutes: 45,
    delayed: false,
    departureTime: new Date(Date.now() + 45 * 60000).toISOString(),
    estimatedDepartTimeUtc: new Date(Date.now() + 45 * 60000).toISOString(),
    scheduledDepartTimeUtc: new Date(Date.now() + 45 * 60000).toISOString(),
    isRealtime: false,
  },
];

// Type definitions for the frontend
export interface ArrivalResponse {
  minutes: number;
  delayed: boolean;
  departureTime: string;
  estimatedDepartTimeUtc: string;
  scheduledDepartTimeUtc: string;
  isRealtime: boolean;
}

export interface SubscriptionResponse {
  id: string;
  deviceID: string;
  routeID: string;
  directionID: string;
  stopID: string;
  routeName: string;
  directionName: string;
  stopName: string;
  notifyMinutes: number;
  timeRangeStart: string;
  timeRangeEnd: string;
  timeCreated: Date;
  timeUpdated: Date;
}

export interface Route {
  id: string;
  shortName: string;
  longName: string;
  name: string;
  type: string;
}

export interface Direction {
  id: string;
  name: string;
}

export interface Stop {
  id: string;
  name: string;
  code: string;
}

export type RegisterDeviceResponse = { id: string; token: string };
export type CreateSubscriptionRequest = {
  routeID: string;
  directionID: string;
  stopID: string;
  notifyMinutes: number;
  timeRangeStart: string;
  timeRangeEnd: string;
};

// Effect derived API client instance - created once and reused for all calls
const client = await Effect.runPromise(
  HttpApiClient.make(BussyApi, {
    baseUrl: BASE_URL,
  }).pipe(Effect.provide(FetchHttpClient.layer)),
);

/**
 * API client - uses derived HttpApiClient for health and device endpoints,
 * uses placeholder data for other endpoints
 */
export const api = {
  // ==========================================================================
  // Device Registration (using derived client)
  // ==========================================================================

  /**
   * Register device with the server
   */
  registerDevice: async () => {
    console.log("[API] Registering device with server...");

    const result = await Effect.runPromise(client.device.create({}));

    localStorage.setItem("bussy-device-id", result.id);
    localStorage.setItem("bussy-device-token", result.token);
    console.log("[API] Device registered:", result.id);

    return result;
  },

  /**
   * Delete device (stubbed - endpoint not implemented)
   */
  deleteDevice: async (_deviceID: string): Promise<{ success: boolean }> => {
    localStorage.removeItem("bussy-device-id");
    localStorage.removeItem("bussy-device-token");
    console.log("[STUB] Device deleted");
    return { success: true };
  },

  // ==========================================================================
  // Metadata (stubbed)
  // ==========================================================================

  /**
   * Get all available routes (stubbed)
   */
  getRoutes: async (): Promise<Array<Route>> => {
    console.log("[STUB] Getting routes");
    return placeholderRoutes;
  },

  /**
   * Get directions for a route (stubbed)
   */
  getDirections: async (_routeID: string): Promise<Array<Direction>> => {
    console.log("[STUB] Getting directions for route");
    return placeholderDirections;
  },

  /**
   * Get stops for a route/direction (stubbed)
   */
  getStops: async (_routeID: string, _directionID: string): Promise<Array<Stop>> => {
    console.log("[STUB] Getting stops");
    return placeholderStops;
  },

  // ==========================================================================
  // Subscriptions CRUD (stubbed)
  // ==========================================================================

  /**
   * Get all subscriptions for a device (stubbed)
   */
  getSubscriptions: async (_deviceID: string): Promise<Array<SubscriptionResponse>> => {
    console.log("[STUB] Getting subscriptions");
    return placeholderSubscriptions;
  },

  /**
   * Create a new subscription (stubbed)
   */
  createSubscription: async (
    deviceID: string,
    subscription: CreateSubscriptionRequest,
  ): Promise<SubscriptionResponse> => {
    const route = placeholderRoutes.find((r) => r.id === subscription.routeID);
    const direction = placeholderDirections.find((d) => d.id === subscription.directionID);
    const stop = placeholderStops.find((s) => s.id === subscription.stopID);

    const newSub: SubscriptionResponse = {
      id: generateId(),
      deviceID,
      routeID: subscription.routeID,
      directionID: subscription.directionID,
      stopID: subscription.stopID,
      routeName: route?.shortName ?? subscription.routeID,
      directionName: direction?.name ?? subscription.directionID,
      stopName: stop?.name ?? subscription.stopID,
      notifyMinutes: subscription.notifyMinutes,
      timeRangeStart: subscription.timeRangeStart,
      timeRangeEnd: subscription.timeRangeEnd,
      timeCreated: new Date(),
      timeUpdated: new Date(),
    };
    placeholderSubscriptions.push(newSub);
    console.log("[STUB] Created subscription:", newSub.id);
    return newSub;
  },

  /**
   * Get a single subscription (stubbed)
   */
  getSubscription: async (id: string): Promise<SubscriptionResponse> => {
    const sub = placeholderSubscriptions.find((s) => s.id === id);
    if (!sub) throw new Error("Subscription not found");
    console.log("[STUB] Getting subscription:", id);
    return sub;
  },

  /**
   * Delete a subscription (stubbed)
   */
  deleteSubscription: async (id: string): Promise<{ success: boolean }> => {
    placeholderSubscriptions = placeholderSubscriptions.filter((s) => s.id !== id);
    console.log("[STUB] Deleted subscription:", id);
    return { success: true };
  },

  // ==========================================================================
  // Arrivals (stubbed)
  // ==========================================================================

  /**
   * Get arrivals for a specific stop (stubbed)
   */
  getArrivals: async (
    _routeID: string,
    _directionID: string,
    _stopCode: string,
  ): Promise<Array<ArrivalResponse>> => {
    console.log("[STUB] Getting arrivals");
    return createPlaceholderArrivals();
  },

  /**
   * Batch arrivals - get arrivals for all device subscriptions (stubbed)
   */
  getArrivalsBatch: async (
    _deviceID: string,
  ): Promise<{ arrivals: Record<string, Array<ArrivalResponse>> }> => {
    console.log("[STUB] Getting batch arrivals");
    const arrivals: Record<string, Array<ArrivalResponse>> = {};
    for (const sub of placeholderSubscriptions) {
      arrivals[sub.id] = createPlaceholderArrivals();
    }
    return { arrivals };
  },

  // ==========================================================================
  // Push Notifications (stubbed)
  // ==========================================================================

  /**
   * Get VAPID public key for push subscription (stubbed)
   */
  getVapidPublicKey: async (): Promise<{ publicKey: string }> => {
    console.log("[STUB] Getting VAPID public key");
    return {
      publicKey:
        "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U",
    };
  },

  /**
   * Register push subscription with server (stubbed)
   */
  registerPushSubscription: async (
    deviceID: string,
    _subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ): Promise<{ success: boolean }> => {
    console.log("[STUB] Registered push subscription for device:", deviceID);
    return { success: true };
  },

  /**
   * Unregister push subscription (stubbed)
   */
  unregisterPushSubscription: async (deviceID: string): Promise<{ success: boolean }> => {
    console.log("[STUB] Unregistered push subscription for device:", deviceID);
    return { success: true };
  },

  // ==========================================================================
  // Health (using derived client)
  // ==========================================================================

  /**
   * Health check - calls real server endpoint via derived client
   */
  health: async () => {
    return Effect.runPromise(client.health.health({}));
  },
};
