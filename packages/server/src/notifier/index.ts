import { Config, Duration, Effect, Schedule } from "effect";
import webpush from "web-push";
import { DeviceService } from "../device";
import { SubscriptionService } from "../subscription";
import { AggieSpiritApi } from "@bussy/aggie-api";
import { fetchArrivalsForSubscriptions } from "../api/arrival";

type SendResult = { _tag: "sent" } | { _tag: "gone" } | { _tag: "error"; error: unknown };

export class ArrivalNotifier extends Effect.Service<ArrivalNotifier>()("ArrivalNotifier", {
  effect: Effect.gen(function* () {
    const vapidPublicKey = yield* Config.string("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = yield* Config.string("VAPID_PRIVATE_KEY");
    const vapidSubject = yield* Config.string("VAPID_SUBJECT").pipe(
      Config.withDefault("mailto:admin@example.com"),
    );

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const devices = yield* DeviceService;
    const subscriptionService = yield* SubscriptionService;
    const aggieApi = yield* AggieSpiritApi;

    const getCurrentHHMM = () => {
      const now = new Date();
      return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    };

    const isInTimeRange = (currentHHMM: string, start: string, end: string): boolean => {
      return currentHHMM >= start && currentHHMM <= end;
    };

    const sendPush = (
      endpoint: string,
      p256dh: string,
      auth: string,
      payload: string,
    ): Effect.Effect<SendResult, never> => {
      return Effect.tryPromise({
        try: () =>
          webpush.sendNotification(
            { endpoint, keys: { p256dh, auth } },
            payload,
          ),
        catch: (error: any) => error,
      }).pipe(
        Effect.matchEffect({
          onSuccess: () => Effect.succeed({ _tag: "sent" as const }),
          onFailure: (error: any) => {
            if (error?.statusCode === 410) {
              return Effect.succeed({ _tag: "gone" as const });
            }
            return Effect.succeed({ _tag: "error" as const, error });
          },
        }),
      );
    };

    const poll = Effect.fn("ArrivalNotifier.poll")(function* () {
      yield* Effect.logDebug("Polling for arrivals to notify...");

      const allDevices = yield* devices.getAllWithPushSubscriptions();
      if (allDevices.length === 0) return;

      const currentHHMM = getCurrentHHMM();

      for (const device of allDevices) {
        if (!device.pushEndpoint || !device.pushP256dh || !device.pushAuth) continue;

        const subs = subscriptionService(device.id);
        const allSubs = yield* subs.getAll();

        const eligibleSubs = allSubs.filter((sub) =>
          isInTimeRange(currentHHMM, sub.timeRangeStart, sub.timeRangeEnd),
        );
        if (eligibleSubs.length === 0) continue;

        const arrivalsBySub = yield* fetchArrivalsForSubscriptions(
          eligibleSubs.map((s) => ({
            id: s.id,
            routeName: s.routeName,
            directionName: s.directionName,
            stopName: s.stopName,
          })),
          aggieApi,
        );

        for (const sub of eligibleSubs) {
          const arrivals = arrivalsBySub[sub.id];
          if (!arrivals || arrivals.length === 0) continue;

          const nearest = arrivals.reduce((a, b) =>
            Math.abs(a.minutes) < Math.abs(b.minutes) ? a : b,
          );

          if (nearest.minutes > sub.notifyMinutes || nearest.minutes < 0) continue;

          if (
            sub.lastNotifiedDepartureTime &&
            nearest.estimatedDepartureTimeUtc === sub.lastNotifiedDepartureTime.toISOString()
          ) {
            continue;
          }

          const payload = JSON.stringify({
            title: `Bus ${sub.routeName} arriving in ${nearest.minutes} min`,
            body: `${sub.directionName} — ${sub.stopName} stop`,
            icon: "/icon-192.png",
            tag: `bus-${sub.id}`,
            data: { subscriptionId: sub.id, url: "/" },
          });

          const result = yield* sendPush(device.pushEndpoint, device.pushP256dh, device.pushAuth, payload);

          if (result._tag === "gone") {
            yield* Effect.logWarning(
              `Push subscription expired for device ${device.id}, clearing`,
            );
            yield* devices.removePushSubscription(device.id);
            break;
          }

          if (result._tag === "error") {
            yield* Effect.logWarning("Push notification send failed", result.error);
            continue;
          }

          yield* subs.updateLastNotified(sub.id, new Date(nearest.estimatedDepartureTimeUtc));
        }
      }
    });

    const interval = yield* Config.duration("POLLING_SOON_INTERVAL").pipe(
      Config.withDefault(Duration.seconds(30)),
    );

    yield* Effect.logInfo(`Starting arrival notification polling every ${interval}...`);

    yield* poll.pipe(
      Effect.catchAll((error) =>
        Effect.logError("Arrival notification poll failed", error),
      ),
      Effect.repeat(Schedule.spaced(interval)),
      Effect.forkDaemon,
    );

    return { poll };
  }),
}) {}
