import { Effect, Layer, Schema } from "effect";
import { HttpClient, HttpClientResponse } from "@effect/platform";

import { AggieSpiritApi } from "../src/aggie-spirit";
import {
  BaseDataResponseSchema,
  NextDepartureTimesResponseSchema,
  PatternPathsResponseSchema,
  VehiclesResponseSchema,
} from "../src/schemas";

const mockBaseData = Schema.decodeSync(BaseDataResponseSchema)({
  routes: [
    {
      key: "01",
      name: "01 - College Main",
      shortName: "01",
      directionList: [
        {
          direction: { key: "01_inbound", name: "Inbound to Campus" },
          destination: "Kyle Field",
          lineColor: null,
          textColor: null,
          patternList: [{ key: "01_inbound_main", isDisplay: true }],
          serviceInterruptionKeys: [],
          upcomingServiceInterruptionKeys: [],
        },
        {
          direction: { key: "01_outbound", name: "Outbound from Campus" },
          destination: "College Main",
          lineColor: null,
          textColor: null,
          patternList: [{ key: "01_outbound_main", isDisplay: true }],
          serviceInterruptionKeys: [],
          upcomingServiceInterruptionKeys: [],
        },
      ],
    },
    {
      key: "15",
      name: "15 - Northside",
      shortName: "15",
      directionList: [
        {
          direction: { key: "15_inbound", name: "Inbound to Campus" },
          destination: "MSC",
          lineColor: null,
          textColor: null,
          patternList: [{ key: "15_inbound_main", isDisplay: true }],
          serviceInterruptionKeys: [],
          upcomingServiceInterruptionKeys: [],
        },
        {
          direction: { key: "15_outbound", name: "Outbound from Campus" },
          destination: "Northside",
          lineColor: null,
          textColor: null,
          patternList: [{ key: "15_outbound_main", isDisplay: true }],
          serviceInterruptionKeys: [],
          upcomingServiceInterruptionKeys: [],
        },
      ],
    },
  ],
  serviceInterruptions: [],
  upcomingServiceInterruptions: [],
  busIconInfos: [],
});

const mockPatternPaths = Schema.decodeSync(PatternPathsResponseSchema)([
  {
    routeKey: "01",
    patternPaths: [
      {
        patternKey: "01_inbound_main",
        directionKey: "01_inbound",
        patternPoints: [
          {
            key: "pp1",
            latitude: 30.618,
            longitude: -96.336,
            stop: { name: "Kyle Field", stopCode: "1001", stopType: 0 },
          },
          {
            key: "pp2",
            latitude: 30.615,
            longitude: -96.34,
            stop: { name: "MSC", stopCode: "1002", stopType: 0 },
          },
          { key: "pp3", latitude: 30.612, longitude: -96.342, stop: null },
        ],
        segmentPaths: [],
      },
    ],
    vehiclesByDirections: [],
  },
]);

const mockDepartures = Schema.decodeSync(NextDepartureTimesResponseSchema)({
  stopCode: "1001",
  routeDirectionTimes: [
    {
      routeKey: "01",
      directionKey: "01_inbound",
      nextDeparts: [
        {
          estimatedDepartTimeUtc: "2026-05-04T13:00:00Z",
          scheduledDepartTimeUtc: "2026-05-04T13:00:00Z",
          isOffRoute: false,
        },
        {
          estimatedDepartTimeUtc: "2026-05-04T13:15:00Z",
          scheduledDepartTimeUtc: "2026-05-04T13:15:00Z",
          isOffRoute: false,
        },
      ],
      frequencyInfo: null,
    },
  ],
  amenities: [{ name: "USB Charging", iconName: "usb" }],
});

const mockVehicles = Schema.decodeSync(VehiclesResponseSchema)([
  {
    routeKey: "01",
    vehiclesByDirections: [
      {
        directionKey: "01_inbound",
        vehicles: [
          {
            key: "v101",
            name: "Bus 101",
            location: {
              lastGpsDate: "2026-05-04T12:59:00Z",
              latitude: 30.616,
              longitude: -96.338,
              speed: 15,
              heading: 180,
            },
            directionKey: "01_inbound",
            directionName: "Inbound to Campus",
            routeKey: "01",
            passengerCapacity: 60,
            passengersOnboard: 23,
            amenities: [{ name: "USB Charging", iconName: "usb" }],
            isExtraTrip: false,
          },
        ],
      },
    ],
  },
]);

function mockResponse(request: any, data: unknown) {
  const body = JSON.stringify(data);
  const webResponse = new Response(body, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  return Effect.succeed(HttpClientResponse.fromWeb(request, webResponse));
}

const mockClient = HttpClient.make((request: any, url: URL) => {
  if (url.pathname.endsWith("GetBaseData")) return mockResponse(request, mockBaseData);
  if (url.pathname.endsWith("GetPatternPaths")) return mockResponse(request, mockPatternPaths);
  if (url.pathname.endsWith("GetNextDepartTimes")) return mockResponse(request, mockDepartures);
  if (url.pathname.endsWith("GetVehicles")) return mockResponse(request, mockVehicles);
  return Effect.die(new Error(`unexpected URL: ${url}`));
});

const MockHttpClient = Layer.succeed(HttpClient.HttpClient, mockClient);

const fakeToken = "A".repeat(288) + "MQ==";
const fakeHtml = `<html><body><input value="${fakeToken}" /></body></html>`;

export function setupMockFetch(): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(fakeHtml, {
      status: 200,
      headers: { "set-cookie": "ASP.NET_SessionId=abc123; path=/; HttpOnly" },
    });
  return () => {
    globalThis.fetch = original;
  };
}

export const AggieSpiritApiMock = AggieSpiritApi.Default.pipe(Layer.provide(MockHttpClient));

const shouldRunLive = process.env.AGGIE_SPIRIT_LIVE === "true";

export const AggieSpiritApiDefault = Layer.unwrapEffect(
  Effect.gen(function* () {
    if (shouldRunLive) {
      const { FetchHttpClient } = yield* Effect.sync(() => import("@effect/platform"));
      return AggieSpiritApi.Default.pipe(Layer.provide(FetchHttpClient.layer));
    }
    return AggieSpiritApiMock;
  }),
);
