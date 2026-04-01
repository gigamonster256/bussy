import { Schema } from "effect"

// ID is a ULID (26 characters)
const ID = Schema.String.pipe(Schema.pattern(/^[0-9A-HJKMNP-TV-Z]{26}$/))

const Timestamp = Schema.Date

// Device schema - matches the database schema with null for nullable fields
export const DeviceSelect = Schema.Struct({
  id: ID,
  token: Schema.String,
  pushEndpoint: Schema.NullOr(Schema.String),
  pushP256dh: Schema.NullOr(Schema.String),
  pushAuth: Schema.NullOr(Schema.String),
  timeCreated: Timestamp,
  timeUpdated: Timestamp,
})

export const DeviceInsert = Schema.Struct({
  id: ID,
  token: Schema.String,
  pushEndpoint: Schema.NullOr(Schema.String),
  pushP256dh: Schema.NullOr(Schema.String),
  pushAuth: Schema.NullOr(Schema.String),
})

export const DeviceUpdate = Schema.partial(DeviceInsert)

export const DeviceCreationResponse = Schema.Struct({
  id: DeviceSelect.fields.id,
  token: DeviceSelect.fields.token,
})

export type Device = Schema.Schema.Type<typeof DeviceSelect>
export type DeviceCreationResponseType = Schema.Schema.Type<typeof DeviceCreationResponse>
