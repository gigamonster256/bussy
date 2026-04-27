import { Effect } from "effect";
import { HttpApiBuilder, HttpApiError } from "@effect/platform";
import { BussyApi, CurrentDevice } from "@bussy/api";
import { AggieSpiritApi } from "@bussy/aggie-api";
import { SubscriptionService } from "../subscription";

function mapDeparture(departure: any) {
  const estTime = departure.estimatedDepartureTimeUtc;
  const schedTime = departure.scheduledDepartureTimeUtc;
  const diffMs =
    estTime && schedTime ? new Date(estTime).getTime() - new Date(schedTime).getTime() : 0;
  return {
    minutes: Math.round(diffMs / 60000),
    delayed: diffMs > 0,
    departureTime: estTime ?? "",
    estimatedDepartureTimeUtc: estTime ?? "",
    scheduledDepartureTimeUtc: schedTime ?? "",
    isRealTime: departure.isOffRoute === false,
  };
}

export const HttpArrivalLive = HttpApiBuilder.group(BussyApi, "arrival", (handlers) =>
  Effect.gen(function* () {
    const aggieApi = yield* AggieSpiritApi;
    const subscriptionService = yield* SubscriptionService;

    return handlers
      .handle(
        "getArrival",
        Effect.fn("HttpArrivalLive.getArrival")(function* ({ path }) {
          const { routeId, directionId, stopCode } = path as any;

          const response = yield* aggieApi
            .getNextDepartureTimes(
              [{ routeKey: routeId as any, directionKey: directionId as any }],
              stopCode as any,
            )
            .pipe(Effect.mapError(() => new HttpApiError.InternalServerError()));

          for (const rdt of response.routeDirectionTimes) {
            if (rdt.routeKey === routeId && rdt.directionKey === directionId) {
              return rdt.nextDeparts.map(mapDeparture);
            }
          }

          return [];
        }),
      )
      .handle(
        "listArrivalBatch",
        Effect.fn("HttpArrivalLive.listArrivalBatch")(function* () {
          const device = yield* CurrentDevice;

          const subs = subscriptionService(device.id);
          const allSubscriptions = yield* subs
            .getAll()
            .pipe(Effect.mapError(() => new HttpApiError.InternalServerError()));

          const baseData = yield* aggieApi
            .getBaseData()
            .pipe(Effect.mapError(() => new HttpApiError.InternalServerError()));
          const allArrival = [];

          for (const sub of allSubscriptions) {
            const route = baseData.routes.find(
              (r) =>
                r.shortName.toLowerCase() === sub.routeName.toLowerCase() ||
                r.name.toLowerCase() === sub.routeName.toLowerCase(),
            );
            if (!route) continue;

            const direction = route.directionList.find(
              (d) => d.destination.toLowerCase() === sub.directionName.toLowerCase(),
            );
            if (!direction) continue;

            const patternKeys = direction.patternList.map((p) => p.key);
            const patternPaths = yield* aggieApi
              .getPatternPaths(patternKeys as any)
              .pipe(Effect.mapError(() => new HttpApiError.InternalServerError()));

            let stopCode = "";
            for (const pp of patternPaths) {
              for (const pattern of pp.patternPaths) {
                if (pattern.directionKey !== direction.direction.key) continue;
                for (const point of pattern.patternPoints) {
                  if (point.stop && point.stop.name.toLowerCase() === sub.stopName.toLowerCase()) {
                    stopCode = point.stop.stopCode;
                    break;
                  }
                }
              }
            }

            if (!stopCode) continue;

            const response = yield* aggieApi
              .getNextDepartureTimes(
                [{ routeKey: route.key, directionKey: direction.direction.key }],
                stopCode as any,
              )
              .pipe(Effect.mapError(() => new HttpApiError.InternalServerError()));

            for (const rdt of response.routeDirectionTimes) {
              const departures = rdt.nextDeparts.map(mapDeparture);
              allArrival.push(...departures);
              break;
            }
          }

          return allArrival;
        }),
      );
  }),
);
