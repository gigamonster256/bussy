import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";
import { TokenAuthorization } from "./token-auth";

const routeIdParam = HttpApiSchema.param("routeId", Schema.String);
const directionIdParam = HttpApiSchema.param("directionId", Schema.String);
const stopCodeParam = HttpApiSchema.param("stopCode", Schema.String);

export const ArrivalSchema = Schema.Struct({
  minutes: Schema.Number,
  delayed: Schema.Boolean,
  departureTime: Schema.String,
  estimatedDepartureTimeUtc: Schema.String,
  scheduledDepartureTimeUtc: Schema.String,
  isRealTime: Schema.Boolean,
});

export const ArrivalGroup = HttpApiGroup.make("arrival")
  .add(
    HttpApiEndpoint.get("getArrival")`/:routeId/:directionId/:stopCode`
      .setPath(
        Schema.Struct({
          routeId: routeIdParam,
          directionId: directionIdParam,
          stopCode: stopCodeParam,
        }),
      )
      .addSuccess(Schema.Array(ArrivalSchema)),
  )
  .add(HttpApiEndpoint.get("listArrivalBatch")`/batch`.addSuccess(Schema.Array(ArrivalSchema)))
  .middleware(TokenAuthorization);
