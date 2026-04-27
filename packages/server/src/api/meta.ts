import { Effect } from "effect";
import { HttpApiBuilder, HttpApiError } from "@effect/platform";
import { BussyApi } from "@bussy/api";
import { AggieSpiritApi } from "@bussy/aggie-api";

export const HttpMetaLive = HttpApiBuilder.group(BussyApi, "meta", (handlers) =>
  Effect.gen(function* () {
    const aggieApi = yield* AggieSpiritApi;

    return handlers
      .handle(
        "listRoutes",
        Effect.fn("HttpMetaLive.listRoutes")(function* () {
          const baseData = yield* aggieApi
            .getBaseData()
            .pipe(Effect.mapError(() => new HttpApiError.InternalServerError()));

          return baseData.routes.map((route) => ({
            id: route.key,
            shortName: route.shortName,
            name: route.name,
          }));
        }),
      )
      .handle(
        "listDirections",
        Effect.fn("HttpMetaLive.listDirections")(({ path }: { path: { routeId: string } }) =>
          Effect.gen(function* () {
            const { routeId } = path;
            const baseData = yield* aggieApi
              .getBaseData()
              .pipe(Effect.mapError(() => new HttpApiError.InternalServerError()));

            const route = baseData.routes.find((r) => r.key === routeId);
            if (!route) {
              return yield* Effect.fail(new HttpApiError.NotFound());
            }

            return route.directionList.map((dir) => ({
              id: dir.direction.key,
              name: dir.direction.name,
            }));
          }),
        ),
      )
      .handle(
        "listStops",
        Effect.fn("HttpMetaLive.listStops")(
          ({ path }: { path: { routeId: string; directionId: string } }) =>
            Effect.gen(function* () {
              const { routeId, directionId } = path;

              const baseData = yield* aggieApi
                .getBaseData()
                .pipe(Effect.mapError(() => new HttpApiError.InternalServerError()));

              const route = baseData.routes.find((r) => r.key === routeId);
              if (!route) {
                return yield* Effect.fail(new HttpApiError.NotFound());
              }

              const direction = route.directionList.find((d) => d.direction.key === directionId);
              if (!direction) {
                return yield* Effect.fail(new HttpApiError.NotFound());
              }

              if (direction.patternList.length === 0) {
                return [];
              }

              const patternPaths = yield* aggieApi
                .getPatternPaths([route.key])
                .pipe(Effect.mapError(() => new HttpApiError.InternalServerError()));

              const stops: Array<{ code: string; name: string }> = [];
              for (const pp of patternPaths) {
                for (const pattern of pp.patternPaths) {
                  if (pattern.directionKey !== directionId) continue;
                  for (const point of pattern.patternPoints) {
                    if (point.stop && point.stop.stopCode && point.stop.name) {
                      if (!stops.some((s) => s.code === point.stop!.stopCode)) {
                        stops.push({
                          code: point.stop!.stopCode,
                          name: point.stop!.name,
                        });
                      }
                    }
                  }
                }
              }

              return stops;
            }),
        ),
      );
  }),
);
