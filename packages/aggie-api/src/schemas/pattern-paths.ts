import { Schema } from "effect";

import { RouteKeySchema, DirectionKeySchema, StopCodeSchema, PatternKeySchema } from "./base-data";
import { VehiclesByDirectionItemSchema } from "./vehicles";

export const PatternPointKeySchema = Schema.String.pipe(Schema.brand("PatternPointKey"));

export type PatternPointKey = Schema.Schema.Type<typeof PatternPointKeySchema>;

export const StopSchema = Schema.Struct({
  name: Schema.String,
  stopCode: StopCodeSchema,
  stopType: Schema.Number,
});

export const PatternPointSchema = Schema.Struct({
  key: PatternPointKeySchema,
  latitude: Schema.Number,
  longitude: Schema.Number,
  stop: Schema.NullOr(StopSchema),
});

export const PatternPathSchema = Schema.Struct({
  patternKey: PatternKeySchema,
  directionKey: DirectionKeySchema,
  patternPoints: Schema.Array(PatternPointSchema),
  segmentPaths: Schema.Array(Schema.Any),
});

export const PatternPathsResponseSchema = Schema.Array(
  Schema.Struct({
    routeKey: RouteKeySchema,
    patternPaths: Schema.Array(PatternPathSchema),
    vehiclesByDirections: Schema.Array(VehiclesByDirectionItemSchema),
  }),
);
