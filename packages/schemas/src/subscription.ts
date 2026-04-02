import { Schema } from "effect"
import { timestampedResource, resourceIDSchema } from "./common"

export const ROUTE_ID_MAX_LENGTH = 64
export const DIRECTION_ID_MAX_LENGTH = 64
export const STOP_ID_MAX_LENGTH = 64

export const TIME_RANGE_PATTERN = /^\d{2}:\d{2}$/
export const TIME_RANGE_LENGTH = 5

export const NOTIFY_MINUTES_MIN = 0
export const NOTIFY_MINUTES_MAX = 60
export const NOTIFY_MINUTES_DEFAULT = 5

export const TIME_RANGE_START_DEFAULT = "00:00"

export const TIME_RANGE_END_DEFAULT = "23:59"

export const SubscriptionSchema = timestampedResource("subscription", {
  deviceID: resourceIDSchema("device"),
  routeID: Schema.String.pipe(Schema.maxLength(ROUTE_ID_MAX_LENGTH)),
  directionID: Schema.String.pipe(Schema.maxLength(DIRECTION_ID_MAX_LENGTH)),
  stopID: Schema.String.pipe(Schema.maxLength(STOP_ID_MAX_LENGTH)),
  notifyMinutes: Schema.Number.pipe(
    Schema.int(),
    Schema.between(NOTIFY_MINUTES_MIN, NOTIFY_MINUTES_MAX)
  ),
  timeRangeStart: Schema.String.pipe(Schema.pattern(TIME_RANGE_PATTERN)),
  timeRangeEnd: Schema.String.pipe(Schema.pattern(TIME_RANGE_PATTERN)),
  timeCreated: Schema.Date,
  timeUpdated: Schema.Date,
})

export type Subscription = Schema.Schema.Type<typeof SubscriptionSchema>
