import { Effect, Config } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform";

import { AggieSpiritAuth } from "./auth";
import {
  type RouteKey,
  type DirectionKey,
  type StopCode,
  BaseDataResponseSchema,
  NextDepartureTimesResponseSchema,
  PatternPathsResponseSchema,
  VehiclesResponseSchema,
} from "./schemas";

const DEFAULT_API_BASE_URL = "https://aggiespirit.ts.tamu.edu";

export class AggieSpiritApi extends Effect.Service<AggieSpiritApi>()("AggieSpiritApi", {
  effect: Effect.gen(function* () {
    const auth = yield* AggieSpiritAuth;
    const baseUrl = yield* Config.string("AGGIE_SPIRIT_API_BASE_URL").pipe(
      Config.withDefault(DEFAULT_API_BASE_URL),
    );
    const client = yield* HttpClient.HttpClient;

    return {
      getBaseData: Effect.fn("aggiespirit.getBaseData")(function* () {
        const headers = yield* auth.headers();

        const response = yield* HttpClientRequest.post(`${baseUrl}/RouteMap/GetBaseData`).pipe(
          HttpClientRequest.setHeaders(headers),
          client.execute,
          Effect.flatMap(HttpClientResponse.schemaBodyJson(BaseDataResponseSchema)),
        );

        return response;
      }),

      getPatternPaths: Effect.fn("aggiespirit.getPatternPaths")(function* (
        routeKeys: Array<RouteKey>,
      ) {
        const headers = yield* auth.headers();

        const formData = new FormData();
        for (const routeKey of routeKeys) {
          formData.append("routeKeys[]", routeKey);
        }

        const response = yield* HttpClientRequest.post(`${baseUrl}/RouteMap/GetPatternPaths`).pipe(
          HttpClientRequest.setHeaders(headers),
          HttpClientRequest.bodyFormData(formData),
          client.execute,
          Effect.flatMap(HttpClientResponse.schemaBodyJson(PatternPathsResponseSchema)),
        );

        return response;
      }),

      getNextDepartureTimes: Effect.fn("aggiespirit.getNextDepartureTimes")(function* (
        routeDirectionKeys: Array<{ routeKey: RouteKey; directionKey: DirectionKey }>,
        stopCode: StopCode,
      ) {
        const headers = yield* auth.headers();

        const formData = new FormData();
        formData.append("stopCode", stopCode);
        for (let i = 0; i < routeDirectionKeys.length; i++) {
          const rdk = routeDirectionKeys[i];
          formData.append(`routeDirectionKeys[${i}][routeKey]`, rdk.routeKey);
          formData.append(`routeDirectionKeys[${i}][directionKey]`, rdk.directionKey);
        }

        const response = yield* HttpClientRequest.post(
          `${baseUrl}/RouteMap/GetNextDepartTimes`,
        ).pipe(
          HttpClientRequest.setHeaders(headers),
          HttpClientRequest.bodyFormData(formData),
          client.execute,
          Effect.flatMap(HttpClientResponse.schemaBodyJson(NextDepartureTimesResponseSchema)),
        );

        return response;
      }),

      getVehicles: Effect.fn("aggiespirit.getVehicles")(function* (routeKeys: Array<RouteKey>) {
        const headers = yield* auth.headers();

        const formData = new FormData();
        for (const routeKey of routeKeys) {
          formData.append("routeKeys[]", routeKey);
        }

        const response = yield* HttpClientRequest.post(`${baseUrl}/RouteMap/GetVehicles`).pipe(
          HttpClientRequest.setHeaders(headers),
          HttpClientRequest.bodyFormData(formData),
          client.execute,
          Effect.flatMap(HttpClientResponse.schemaBodyJson(VehiclesResponseSchema)),
        );

        return response;
      }),
    };
  }),
  dependencies: [AggieSpiritAuth.Default],
}) {}
