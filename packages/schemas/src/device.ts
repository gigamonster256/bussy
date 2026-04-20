import { Schema } from "effect";
import { timestampedResource } from "./common";

export const DeviceSchema = timestampedResource("device", {
  token: Schema.String,
  pushEndpoint: Schema.NullOr(Schema.String),
  pushP256dh: Schema.NullOr(Schema.String),
  pushAuth: Schema.NullOr(Schema.String),
});

export type Device = Schema.Schema.Type<typeof DeviceSchema>;
