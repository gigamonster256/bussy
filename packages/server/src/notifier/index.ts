import { Config, Data, Duration, Effect, Schedule } from "effect";
import webpush from "web-push";
import { DeviceService } from "../device";
import { SubscriptionService } from "../subscription";
import { AggieSpiritApi } from "@bussy/aggie-api";
import { fetchArrivalsForSubscriptions } from "../api/arrival";

class PushGoneError extends Data.TaggedError("PushGone") {}
class PushError extends Data.TaggedError("PushError")<{ error: unknown }> {}
class DeviceExpired extends Data.TaggedError("DeviceExpired")<{ deviceId: string }> {}


export class ArrivalNotifier extends Effect.Service<ArrivalNotifier>()("ArrivalNotifier", {
  effect: Effect.gen(function* () {
    const vapidPublicKey = yield* Config.string("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = yield* Config.string("VAPID_PRIVATE_KEY");
    const vapidSubject = yield* Config.string("VAPID_SUBJECT");
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

    const sendPush = Effect.fn("ArrivalNotifier.sendPush")(function* (
      endpoint: string,
      p256dh: string,
      auth: string,
      payload: string,
    ) {
      return yield* Effect.tryPromise({
        try: () =>
          webpush.sendNotification(
            { endpoint, keys: { p256dh, auth } },
            payload,
          ),
        catch: (error: any) => {
          if (error?.statusCode === 410) return new PushGoneError();
          return new PushError({ error });
        },
      });
    });

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

        yield* Effect.gen(function* () {
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

            yield* sendPush(device.pushEndpoint, device.pushP256dh, device.pushAuth, payload).pipe(
              Effect.catchTag("PushGone", () =>
                Effect.gen(function* () {
                  yield* Effect.logWarning(
                    `Push subscription expired for device ${device.id}, clearing`,
                  );
                  yield* devices.removePushSubscription(device.id);
                  return yield* Effect.fail(
                    new DeviceExpired({ deviceId: device.id }),
                  );
                }),
              ),
              Effect.catchTag("PushError", (e) =>
                Effect.logWarning("Push notification send failed", e.error),
              ),
            );

            yield* subs.updateLastNotified(sub.id, new Date(nearest.estimatedDepartureTimeUtc));
          }
        }).pipe(
          Effect.catchTag("DeviceExpired", () => Effect.void),
        );
      }
    });

    const start = Effect.fn("ArrivalNotifier.start")(function* () {
      const interval = yield* Config.duration("POLLING_SOON_INTERVAL").pipe(
        Config.withDefault(Duration.seconds(30)),
      );

      yield* Effect.logInfo(`Starting arrival notification polling every ${interval}...`);

      return yield* poll().pipe(
        Effect.catchAll((error) =>
          Effect.logError("Arrival notification poll failed", error),
        ),
        Effect.repeat(Schedule.spaced(interval)),
        Effect.forkDaemon,
      );
    });

    return { poll, start };
  }),
}) {}
