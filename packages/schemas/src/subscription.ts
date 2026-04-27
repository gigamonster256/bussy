import { Schema } from "effect";
import { timestampedResource, resourceIDSchema } from "./common";

export const ROUTE_NAME_MAX_LENGTH = 128;
export const DIRECTION_NAME_MAX_LENGTH = 128;
export const STOP_NAME_MAX_LENGTH = 128;

export const ROUTE_ID_MAX_LENGTH = 64;
export const DIRECTION_ID_MAX_LENGTH = 64;
export const STOP_ID_MAX_LENGTH = 64;

export const TIME_RANGE_PATTERN = /^\d{2}:\d{2}$/;
export const TIME_RANGE_LENGTH = 5;

export const NOTIFY_MINUTES_MIN = 0;
export const NOTIFY_MINUTES_MAX = 60;
export const NOTIFY_MINUTES_DEFAULT = 5;

export const TIME_RANGE_START_DEFAULT = "00:00";

export const TIME_RANGE_END_DEFAULT = "23:59";

const routeNameSchema = Schema.String.pipe(Schema.maxLength(ROUTE_NAME_MAX_LENGTH));
const directionNameSchema = Schema.String.pipe(Schema.maxLength(DIRECTION_NAME_MAX_LENGTH));
const stopNameSchema = Schema.String.pipe(Schema.maxLength(STOP_NAME_MAX_LENGTH));
const notifyMinutesSchema = Schema.Int.pipe(Schema.between(NOTIFY_MINUTES_MIN, NOTIFY_MINUTES_MAX));
const timeRangeSchema = Schema.String.pipe(Schema.pattern(TIME_RANGE_PATTERN));

export const SubscriptionSchema = timestampedResource("subscription", {
  deviceID: resourceIDSchema("device"),
  routeName: routeNameSchema,
  directionName: directionNameSchema,
  stopName: stopNameSchema,
  notifyMinutes: notifyMinutesSchema,
  timeRangeStart: timeRangeSchema,
  timeRangeEnd: timeRangeSchema,
  timeCreated: Schema.Date,
  timeUpdated: Schema.Date,
});

export type Subscription = Schema.Schema.Type<typeof SubscriptionSchema>;

export const SubscriptionCreationParams = Schema.Struct({
  routeName: routeNameSchema,
  directionName: directionNameSchema,
  stopName: stopNameSchema,
  notifyMinutes: notifyMinutesSchema,
  timeRangeStart: timeRangeSchema,
  timeRangeEnd: timeRangeSchema,
});

export type SubscriptionCreationParamsType = Schema.Schema.Type<typeof SubscriptionCreationParams>;

export const SubscriptionUpdateParams = Schema.Struct({
  notifyMinutes: Schema.optional(notifyMinutesSchema),
  timeRangeStart: Schema.optional(timeRangeSchema),
  timeRangeEnd: Schema.optional(timeRangeSchema),
});

export type SubscriptionUpdateParamsType = Schema.Schema.Type<typeof SubscriptionUpdateParams>;

export const SubscriptionCreationResponse = Schema.Struct({
  id: resourceIDSchema("subscription"),
});
