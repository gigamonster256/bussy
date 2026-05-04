import { Effect } from "effect";
import { HttpApiBuilder, HttpApiError } from "@effect/platform";
import { BussyApi, CurrentDevice } from "@bussy/api";
import { AggieSpiritApi } from "@bussy/aggie-api";
import { SubscriptionService } from "../subscription";

export function mapDeparture(departure: {
  estimatedDepartureTimeUtc?: string | null;
  estimatedDepartTimeUtc?: string | null;
  scheduledDepartureTimeUtc?: string | null;
  scheduledDepartTimeUtc?: string | null;
  isOffRoute: boolean;
}) {
  const estTime = departure.estimatedDepartureTimeUtc ?? departure.estimatedDepartTimeUtc ?? null;
  const schedTime = departure.scheduledDepartureTimeUtc ?? departure.scheduledDepartTimeUtc ?? null;
  const diffMs =
    estTime && schedTime ? new Date(estTime).getTime() - new Date(schedTime).getTime() : 0;
  return {
    minutes: Math.round(diffMs / 60000),
    delayed: diffMs > 0,
    departureTime: estTime ?? "",
    estimatedDepartureTimeUtc: estTime ?? "",
    scheduledDepartureTimeUtc: schedTime ?? "",
    isRealTime: estTime !== null,
  };
}

export function fetchDeparturesForSubscriptions(
  subs: ReadonlyArray<{ id: string; routeName: string; directionName: string; stopName: string }>,
  aggieApi: {
    getBaseData: () => Effect.Effect<{ routes: ReadonlyArray<any> }>;
    getPatternPaths: (routeKeys: ReadonlyArray<any>) => Effect.Effect<ReadonlyArray<any>>;
    getNextDepartureTimes: (
      rdks: ReadonlyArray<any>,
      stopCode: any,
    ) => Effect.Effect<{ routeDirectionTimes: ReadonlyArray<any> }>;
  },
): Effect.Effect<Record<string, Array<ReturnType<typeof mapDeparture>>>> {
  return Effect.gen(function* () {
    const baseData = yield* aggieApi.getBaseData();
    const departuresBySub: Record<string, Array<ReturnType<typeof mapDeparture>>> = {};

    for (const sub of subs) {
      const route = baseData.routes.find(
        (r) =>
          r.shortName.toLowerCase() === sub.routeName.toLowerCase() ||
          r.name.toLowerCase() === sub.routeName.toLowerCase(),
      );
      if (!route) continue;

      const direction = route.directionList.find(
        (d) =>
          d.direction.name.toLowerCase() === sub.directionName.toLowerCase() ||
          d.destination.toLowerCase() === sub.directionName.toLowerCase(),
      );
      if (!direction) continue;

      const patternPaths = yield* aggieApi.getPatternPaths([route.key]);

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

      const response = yield* aggieApi.getNextDepartureTimes(
        [{ routeKey: route.key, directionKey: direction.direction.key }],
        stopCode,
      );

      for (const rdt of response.routeDirectionTimes) {
        const departures = rdt.nextDeparts.map(mapDeparture);
        departuresBySub[sub.id] = departures;
        break;
      }
    }

    return departuresBySub;
  });
}

export const HttpDepartureLive = HttpApiBuilder.group(BussyApi, "departure", (handlers) =>
  Effect.gen(function* () {
    const aggieApi = yield* AggieSpiritApi;
    const subscriptionService = yield* SubscriptionService;

    return handlers
      .handle(
        "getDeparture",
        Effect.fn("HttpDepartureLive.getDeparture")(function* ({ path }) {
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
        "listDepartureBatch",
        Effect.fn("HttpDepartureLive.listDepartureBatch")(function* () {
          const device = yield* CurrentDevice;

          const subs = subscriptionService(device.id);
          const allSubscriptions = yield* subs
            .getAll()
            .pipe(Effect.mapError(() => new HttpApiError.InternalServerError()));

          const departuresBySub = yield* fetchDeparturesForSubscriptions(allSubscriptions, aggieApi);

          return departuresBySub;
        }),
      );
  }),
);
