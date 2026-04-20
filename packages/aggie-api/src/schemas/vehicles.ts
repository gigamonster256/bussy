import { Schema } from "effect";

import { DirectionKeySchema, RouteKeySchema } from "./base-data";

export const VehicleKeySchema = Schema.String.pipe(Schema.brand("VehicleKey"));

export type VehicleKey = Schema.Schema.Type<typeof VehicleKeySchema>;

export const VehicleAmenitySchema = Schema.Struct({
  name: Schema.String,
  iconName: Schema.String,
});

export const VehicleSchema = Schema.Struct({
  key: VehicleKeySchema,
  name: Schema.String,
  location: Schema.Struct({
    lastGpsDate: Schema.String,
    latitude: Schema.Number,
    longitude: Schema.Number,
    speed: Schema.Number,
    heading: Schema.Number,
  }),
  directionKey: DirectionKeySchema,
  directionName: Schema.String,
  routeKey: RouteKeySchema,
  passengerCapacity: Schema.Number,
  passengersOnboard: Schema.Number,
  amenities: Schema.Array(VehicleAmenitySchema),
  isExtraTrip: Schema.Boolean,
});

export const VehiclesByDirectionItemSchema = Schema.Struct({
  directionKey: DirectionKeySchema,
  vehicles: Schema.Array(VehicleSchema),
});

export const VehiclesResponseSchema = Schema.Array(
  Schema.Struct({
    routeKey: RouteKeySchema,
    vehiclesByDirections: Schema.Array(VehiclesByDirectionItemSchema),
  }),
);
