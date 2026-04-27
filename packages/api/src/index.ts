export { BussyApi } from "./api";

export { HealthGroup } from "./health";
export { DeviceGroup } from "./device";
export { SubscriptionGroup } from "./subscription";
export { MetaGroup, MetaRouteSchema, MetaDirectionSchema, MetaStopSchema } from "./meta";
export { ArrivalGroup, ArrivalSchema } from "./arrival";

// Schemas - re-exported from @bussy/schemas (single source of truth)
export { DeviceSchema } from "@bussy/schemas";

export {
  SubscriptionSchema,
  SubscriptionCreationParams,
  SubscriptionUpdateParams,
  SubscriptionCreationResponse,
} from "@bussy/schemas";

// Types
export type { Device } from "@bussy/schemas";
export type {
  Subscription,
  SubscriptionCreationParamsType,
  SubscriptionUpdateParamsType,
} from "@bussy/schemas";

// Constants for validation
export {
  ROUTE_NAME_MAX_LENGTH,
  DIRECTION_NAME_MAX_LENGTH,
  STOP_NAME_MAX_LENGTH,
  TIME_RANGE_PATTERN,
  TIME_RANGE_LENGTH,
  NOTIFY_MINUTES_MIN,
  NOTIFY_MINUTES_MAX,
  NOTIFY_MINUTES_DEFAULT,
  TIME_RANGE_START_DEFAULT,
  TIME_RANGE_END_DEFAULT,
  // Runtime IDs - not persisted, used in API requests
  ROUTE_ID_MAX_LENGTH,
  DIRECTION_ID_MAX_LENGTH,
  STOP_ID_MAX_LENGTH,
} from "@bussy/schemas";

// Middleware
export { CurrentDevice, TokenAuthorization } from "./token-auth";
