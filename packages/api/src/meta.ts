import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, HttpApiError } from "@effect/platform";
import { Schema } from "effect";

const routeIdParam = HttpApiSchema.param("routeId", Schema.String);
const directionIdParam = HttpApiSchema.param("directionId", Schema.String);

export const MetaRouteSchema = Schema.Struct({
  id: Schema.String,
  shortName: Schema.String,
  name: Schema.String,
});

export const MetaDirectionSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});

export const MetaStopSchema = Schema.Struct({
  code: Schema.String,
  name: Schema.String,
});

export const MetaGroup = HttpApiGroup.make("meta")
  .add(HttpApiEndpoint.get("listRoutes", "/routes").addSuccess(Schema.Array(MetaRouteSchema)))
  .add(
    HttpApiEndpoint.get("listDirections", "/routes/:routeId/directions")
      .setPath(Schema.Struct({ routeId: routeIdParam }))
      .addSuccess(Schema.Array(MetaDirectionSchema))
      .addError(HttpApiError.NotFound),
  )
  .add(
    HttpApiEndpoint.get("listStops", "/stops/:routeId/:directionId")
      .setPath(Schema.Struct({ routeId: routeIdParam, directionId: directionIdParam }))
      .addSuccess(Schema.Array(MetaStopSchema))
      .addError(HttpApiError.NotFound),
  );
