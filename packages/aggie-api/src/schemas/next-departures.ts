import { Schema } from "effect";
import { DirectionKeySchema, RouteKeySchema, StopCodeSchema } from "./base-data";

export const NextDepartSchema = Schema.Struct({
  estimatedDepartTimeUtc: Schema.NullOr(Schema.String),
  scheduledDepartTimeUtc: Schema.NullOr(Schema.String),
  isOffRoute: Schema.Boolean,
});

export const RouteDirectionTimeSchema = Schema.Struct({
  routeKey: RouteKeySchema,
  directionKey: DirectionKeySchema,
  nextDeparts: Schema.Array(NextDepartSchema),
  frequencyInfo: Schema.NullOr(Schema.Any),
});

export const NextDepartureTimesResponseSchema = Schema.Struct({
  stopCode: StopCodeSchema,
  routeDirectionTimes: Schema.Array(RouteDirectionTimeSchema),
  amenities: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      iconName: Schema.String,
    }),
  ),
});
