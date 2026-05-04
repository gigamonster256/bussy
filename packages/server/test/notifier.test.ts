import { describe, expect, it } from "@effect/vitest";
import { ConfigProvider, Effect, Layer } from "effect";
import { DeviceService } from "../src/device";
import { SubscriptionService } from "../src/subscription";
import { DepartureNotifier } from "../src/notifier";
import { AggieSpiritApi } from "@bussy/aggie-api";
import { TestDatabaseLive } from "./fixtures";

const mockBaseData = {
  routes: [
    {
      key: "route_15_key",
      name: "Route 15",
      shortName: "15",
      directionList: [
        {
          direction: { key: "dir_out_key", name: "Outbound" },
          destination: "TO RIVERWAY",
        },
      ],
    },
  ],
};

const mockPatternPaths = [
  {
    routeKey: "route_15_key",
    patternPaths: [
      {
        patternKey: "pat_1",
        directionKey: "dir_out_key",
        patternPoints: [
          {
            key: "pp1",
            latitude: 30.6,
            longitude: -96.3,
            stop: { name: "Kyle Field", stopCode: "1001", stopType: 0 },
          },
        ],
      },
    ],
  },
];

const mockDepartures = {
  stopCode: "1001",
  routeDirectionTimes: [
    {
      routeKey: "route_15_key",
      directionKey: "dir_out_key",
      nextDeparts: [
        {
          estimatedDepartTimeUtc: "2026-05-04T12:05:00Z",
          scheduledDepartTimeUtc: "2026-05-04T12:00:00Z",
          isOffRoute: false,
        },
      ],
    },
  ],
};

const MockAggieSpiritApi = Layer.succeed(AggieSpiritApi, {
  getBaseData: () => Effect.succeed(mockBaseData as any),
  getPatternPaths: () => Effect.succeed(mockPatternPaths as any),
  getNextDepartureTimes: () => Effect.succeed(mockDepartures as any),
  getVehicles: () => Effect.succeed([]),
});

const VapidConfigProvider = ConfigProvider.fromMap(
  new Map([
    ["VAPID_PUBLIC_KEY", "BDWK8XJ4JCi2BGYvLks86dzkLRBn2OUBP5bI_CnRdk3dLpj5BUzkNgjhHWyvbAag4VFZPO5m6EEk0K4wzB1bb_s"],
    ["VAPID_PRIVATE_KEY", "1iURZkJQAkSSKc0xeQ1asewUfL7le68Rt0Ong4QZQbk"],
    ["VAPID_SUBJECT", "mailto:test@test.com"],
  ]),
);

const BaseLayer = Layer.mergeAll(DeviceService.Default, SubscriptionService.Default).pipe(
  Layer.provide(TestDatabaseLive),
);

const NotifierTestLayer = Layer.provideMerge(
  DepartureNotifier.Default,
  Layer.mergeAll(DeviceService.Default, SubscriptionService.Default),
).pipe(
  Layer.provide(TestDatabaseLive),
  Layer.provide(MockAggieSpiritApi),
  Layer.provide(Layer.setConfigProvider(VapidConfigProvider)),
);

describe("DepartureNotifier", () => {
  describe("getAllWithPushSubscriptions", () => {
    it.effect("should return devices with push subscriptions", () =>
      Effect.gen(function* () {
        const service = yield* DeviceService;

        const created = yield* service.create();
        yield* service.setPushSubscription(
          created.id,
          "https://example.com/push",
          "test-p256dh",
          "test-auth",
        );

        const devices = yield* service.getAllWithPushSubscriptions();
        expect(devices.some((d) => d.id === created.id)).toBe(true);

        yield* service.deleteByID(created.id);
      }).pipe(Effect.provide(BaseLayer)),
    );

    it.effect("should not return devices without push subscriptions", () =>
      Effect.gen(function* () {
        const service = yield* DeviceService;

        const created = yield* service.create();
        const devices = yield* service.getAllWithPushSubscriptions();
        expect(devices.find((d) => d.id === created.id)).toBeUndefined();

        yield* service.deleteByID(created.id);
      }).pipe(Effect.provide(BaseLayer)),
    );
  });

  describe("updateLastNotified", () => {
    it.effect("should update lastNotifiedDepartureTime and lastNotifiedAt", () =>
      Effect.gen(function* () {
        const deviceService = yield* DeviceService;
        const subscriptionService = yield* SubscriptionService;

        const device = yield* deviceService.create();
        const subs = subscriptionService(device.id);

        const created = yield* subs.create({
          routeName: "15",
          directionName: "Outbound",
          stopName: "Kyle Field",
          notifyMinutes: 5,
          timeRangeStart: "00:00",
          timeRangeEnd: "23:59",
        });

        const departureTime = new Date("2026-05-04T12:05:00Z");
        yield* subs.updateLastNotified(created.id, departureTime);

        const updated = yield* subs.getByID(created.id);
        expect(updated.lastNotifiedDepartureTime).toBeDefined();
        expect(updated.lastNotifiedAt).toBeDefined();

        yield* subs.deleteByID(created.id);
        yield* deviceService.deleteByID(device.id);
      }).pipe(Effect.provide(BaseLayer)),
    );
  });

  describe("poll", () => {
    it.effect("should handle poll without crashing when push fails", () =>
      Effect.gen(function* () {
        const deviceService = yield* DeviceService;
        const subService = yield* SubscriptionService;

        const device = yield* deviceService.create();
        yield* deviceService.setPushSubscription(
          device.id,
          "https://example.com/push",
          "test-p256dh",
          "test-auth",
        );

        const subs = subService(device.id);
        yield* subs.create({
          routeName: "15",
          directionName: "Outbound",
          stopName: "Kyle Field",
          notifyMinutes: 10,
          timeRangeStart: "00:00",
          timeRangeEnd: "23:59",
        });

        const notifier = yield* DepartureNotifier;
        yield* notifier.poll();

        yield* deviceService.deleteByID(device.id);
      }).pipe(
        Effect.provide(NotifierTestLayer),
      ),
    );
  });
});
