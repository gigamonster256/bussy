import { Schema } from "effect"

// ID format: prefix_ULID (e.g., "dev_01HXR1Y..." or "sub_01HXR1Y...")
const ID = Schema.String.pipe(Schema.pattern(/^(dev|sub)_[0-9A-HJKMNP-TV-Z]{26}$/))

const Timestamp = Schema.Date

// Subscription schema
export const SubscriptionSelect = Schema.Struct({
  id: ID,
  deviceID: ID,
  routeID: Schema.String.pipe(Schema.maxLength(64)),
  directionID: Schema.String.pipe(Schema.maxLength(64)),
  stopID: Schema.String.pipe(Schema.maxLength(64)),
  notifyMinutes: Schema.Number.pipe(Schema.int(), Schema.between(0, 60)),
  timeRangeStart: Schema.String.pipe(Schema.pattern(/^\d{2}:\d{2}$/)),
  timeRangeEnd: Schema.String.pipe(Schema.pattern(/^\d{2}:\d{2}$/)),
  timeCreated: Timestamp,
  timeUpdated: Timestamp,
})

export const SubscriptionInsert = Schema.Struct({
  routeID: SubscriptionSelect.fields.routeID,
  directionID: SubscriptionSelect.fields.directionID,
  stopID: SubscriptionSelect.fields.stopID,
  notifyMinutes: SubscriptionSelect.fields.notifyMinutes,
  timeRangeStart: SubscriptionSelect.fields.timeRangeStart,
  timeRangeEnd: SubscriptionSelect.fields.timeRangeEnd,
})

export const SubscriptionUpdate = Schema.partial(SubscriptionInsert)

export const SubscriptionCreationParams = SubscriptionInsert

export const SubscriptionCreationResponse = Schema.Struct({
  id: ID,
})

export type Subscription = Schema.Schema.Type<typeof SubscriptionSelect>
export type SubscriptionCreationParamsType = Schema.Schema.Type<typeof SubscriptionCreationParams>
