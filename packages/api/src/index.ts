export { BussyApi } from "./api"

export { HealthGroup } from "./health"
export { DeviceGroup } from "./device"
// export { SubscriptionGroup } from "./subscription/api"

// Schemas - re-exported from @bussy/schemas (single source of truth)
export {
  DeviceSchema,
} from "@bussy/schemas"

export {
  SubscriptionSchema,
} from "@bussy/schemas"

// Types
export type { Device } from "@bussy/schemas"
export type { Subscription } from "@bussy/schemas"

// Constants for validation
export {
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
} from "@bussy/schemas"

// Middleware
export { CurrentDevice, TokenAuthorization } from "./token-auth"
