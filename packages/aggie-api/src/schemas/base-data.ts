import { Schema } from "effect";

export const RouteKeySchema = Schema.String.pipe(Schema.brand("RouteKey"));
export const DirectionKeySchema = Schema.String.pipe(Schema.brand("DirectionKey"));
export const PatternKeySchema = Schema.String.pipe(Schema.brand("PatternKey"));
export const StopCodeSchema = Schema.String.pipe(Schema.brand("StopCode"));

export type RouteKey = Schema.Schema.Type<typeof RouteKeySchema>;
export type DirectionKey = Schema.Schema.Type<typeof DirectionKeySchema>;
export type PatternKey = Schema.Schema.Type<typeof PatternKeySchema>;
export type StopCode = Schema.Schema.Type<typeof StopCodeSchema>;

export const DirectionSchema = Schema.Struct({
  key: DirectionKeySchema,
  name: Schema.String,
});

export const PatternSchema = Schema.Struct({
  key: PatternKeySchema,
  isDisplay: Schema.Boolean,
});

export const DirectionListItemSchema = Schema.Struct({
  direction: DirectionSchema,
  destination: Schema.String,
  lineColor: Schema.Any,
  textColor: Schema.Any,
  patternList: Schema.Array(PatternSchema),
  serviceInterruptionKeys: Schema.Array(Schema.Any),
  upcomingServiceInterruptionKeys: Schema.Array(Schema.Any),
});

export const RouteSchema = Schema.Struct({
  key: RouteKeySchema,
  name: Schema.String,
  shortName: Schema.String,
  directionList: Schema.Array(DirectionListItemSchema),
});

export const BaseDataResponseSchema = Schema.Struct({
  routes: Schema.Array(RouteSchema),
  serviceInterruptions: Schema.Array(Schema.Any),
  upcomingServiceInterruptions: Schema.Array(Schema.Any),
  busIconInfos: Schema.Array(Schema.Any),
});
