// ============================================================================
// @bussy/schemas - Shared schemas and constants
// ============================================================================
//
// This package contains the source of truth for all data schemas.
// It has zero runtime dependencies beyond "effect" and "ulid" and can be used
// by both frontend and backend code.
//
// The shared constants (e.g., ROUTE_ID_MAX_LENGTH) are used by both:
// 1. Effect schemas for validation
// 2. Drizzle table definitions for database column types
//

// Common exports - ID utilities
export {
  prefixes,
  createID,
  ULID_LENGTH,
  ID_LENGTH,
} from "./common"

// Types
export type {
  ResourcePrefix,
} from "./common"

// Device exports
export {
  DeviceSchema,
} from "./device"
export type {
  Device,
} from "./device"

// Subscription exports
export {
  SubscriptionSchema,
  // Constants
  ROUTE_ID_MAX_LENGTH,
  DIRECTION_ID_MAX_LENGTH,
  STOP_ID_MAX_LENGTH,
  TIME_RANGE_PATTERN,
  TIME_RANGE_LENGTH,
  NOTIFY_MINUTES_MIN,
  NOTIFY_MINUTES_MAX,
  NOTIFY_MINUTES_DEFAULT,
  TIME_RANGE_START_DEFAULT,
  TIME_RANGE_END_DEFAULT
} from "./subscription"
export type {
  Subscription,
} from "./subscription"
