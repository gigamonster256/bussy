import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { mapDeparture, fetchDeparturesForSubscriptions } from "../src/api/departure";

describe("mapDeparture", () => {
  it("should return isRealTime true when estimatedDepartureTimeUtc is non-null", () => {
    const result = mapDeparture({
      estimatedDepartureTimeUtc: "2026-05-04T12:00:00Z",
      scheduledDepartureTimeUtc: "2026-05-04T12:00:00Z",
      isOffRoute: false,
    });
    expect(result.isRealTime).toBe(true);
  });

  it("should return isRealTime false when estimatedDepartureTimeUtc is null", () => {
    const result = mapDeparture({
      estimatedDepartureTimeUtc: null,
      scheduledDepartureTimeUtc: "2026-05-04T12:00:00Z",
      isOffRoute: false,
    });
    expect(result.isRealTime).toBe(false);
  });

  it("should return isRealTime false when estimatedDepartureTimeUtc is absent", () => {
    const result = mapDeparture({
      scheduledDepartTimeUtc: "2026-05-04T12:00:00Z",
      isOffRoute: false,
    });
    expect(result.isRealTime).toBe(false);
  });

  it("should use estimatedDepartTimeUtc fallback field when estimatedDepartureTimeUtc is absent", () => {
    const result = mapDeparture({
      estimatedDepartTimeUtc: "2026-05-04T12:00:00Z",
      scheduledDepartTimeUtc: "2026-05-04T12:00:00Z",
      isOffRoute: true,
    });
    expect(result.isRealTime).toBe(true);
    expect(result.estimatedDepartureTimeUtc).toBe("2026-05-04T12:00:00Z");
  });

  it("should compute positive minutes delay", () => {
    const result = mapDeparture({
      estimatedDepartureTimeUtc: "2026-05-04T12:05:00Z",
      scheduledDepartureTimeUtc: "2026-05-04T12:00:00Z",
      isOffRoute: false,
    });
    expect(result.minutes).toBe(5);
    expect(result.delayed).toBe(true);
  });

  it("should compute zero delay when on time", () => {
    const result = mapDeparture({
      estimatedDepartureTimeUtc: "2026-05-04T12:00:00Z",
      scheduledDepartureTimeUtc: "2026-05-04T12:00:00Z",
      isOffRoute: false,
    });
    expect(result.minutes).toBe(0);
    expect(result.delayed).toBe(false);
  });

  it("should compute negative minutes delay when early", () => {
    const result = mapDeparture({
      estimatedDepartureTimeUtc: "2026-05-04T11:55:00Z",
      scheduledDepartureTimeUtc: "2026-05-04T12:00:00Z",
      isOffRoute: false,
    });
    expect(result.minutes).toBe(-5);
    expect(result.delayed).toBe(false);
  });

  it("should return zero minutes when estimated time is null", () => {
    const result = mapDeparture({
      estimatedDepartureTimeUtc: null,
      scheduledDepartureTimeUtc: "2026-05-04T12:00:00Z",
      isOffRoute: false,
    });
    expect(result.minutes).toBe(0);
    expect(result.delayed).toBe(false);
    expect(result.departureTime).toBe("");
  });

  it("should return zero minutes when scheduled time is null", () => {
    const result = mapDeparture({
      estimatedDepartureTimeUtc: "2026-05-04T12:00:00Z",
      scheduledDepartureTimeUtc: null,
      isOffRoute: false,
    });
    expect(result.minutes).toBe(0);
    expect(result.delayed).toBe(false);
  });

  it("should populate departureTime from estimated time", () => {
    const result = mapDeparture({
      estimatedDepartureTimeUtc: "2026-05-04T12:00:00Z",
      scheduledDepartureTimeUtc: "2026-05-04T12:05:00Z",
      isOffRoute: false,
    });
    expect(result.departureTime).toBe("2026-05-04T12:00:00Z");
    expect(result.estimatedDepartureTimeUtc).toBe("2026-05-04T12:00:00Z");
    expect(result.scheduledDepartureTimeUtc).toBe("2026-05-04T12:05:00Z");
  });
});

describe("fetchDeparturesForSubscriptions", () => {
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
            patternList: [
              { key: "pat_1", isDisplay: true },
              { key: "pat_2", isDisplay: false },
            ],
          },
          {
            direction: { key: "dir_in_key", name: "Inbound" },
            destination: "TO MARCO",
            patternList: [{ key: "pat_3", isDisplay: true }],
          },
        ],
      },
      {
        key: "route_12_key",
        name: "Route 12",
        shortName: "12",
        directionList: [
          {
            direction: { key: "dir_12_out_key", name: "Outbound" },
            destination: "TO TOWER",
            patternList: [{ key: "pat_4", isDisplay: true }],
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
            { key: "pp1", latitude: 30.6, longitude: -96.3, stop: null },
            {
              key: "pp2",
              latitude: 30.62,
              longitude: -96.34,
              stop: { name: "Kyle Field", stopCode: "1001", stopType: 0 },
            },
            {
              key: "pp3",
              latitude: 30.63,
              longitude: -96.35,
              stop: { name: "Lubbock & 4th", stopCode: "1002", stopType: 0 },
            },
          ],
        },
        {
          patternKey: "pat_2",
          directionKey: "dir_out_key",
          patternPoints: [
            {
              key: "pp4",
              latitude: 30.61,
              longitude: -96.33,
              stop: { name: "Kyle Field", stopCode: "1001", stopType: 0 },
            },
          ],
        },
      ],
    },
    {
      routeKey: "route_12_key",
      patternPaths: [
        {
          patternKey: "pat_4",
          directionKey: "dir_12_out_key",
          patternPoints: [
            {
              key: "pp5",
              latitude: 30.6,
              longitude: -96.3,
              stop: { name: "Student Center", stopCode: "2001", stopType: 0 },
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
          {
            estimatedDepartTimeUtc: "2026-05-04T12:35:00Z",
            scheduledDepartTimeUtc: "2026-05-04T12:30:00Z",
            isOffRoute: false,
          },
        ],
      },
    ],
  };

  it.effect("should return departures grouped by subscription id", () =>
    Effect.gen(function* () {
      const mockApi = {
        getBaseData: () => Effect.succeed(mockBaseData as any),
        getPatternPaths: () => Effect.succeed(mockPatternPaths as any),
        getNextDepartureTimes: () => Effect.succeed(mockDepartures as any),
      };

      const subs = [
        {
          id: "sub_abc",
          routeName: "15",
          directionName: "Outbound",
          stopName: "Kyle Field",
        },
      ];

      const result = yield* fetchDeparturesForSubscriptions(subs, mockApi as any);

      expect(Object.keys(result)).toEqual(["sub_abc"]);
      expect(result.sub_abc).toHaveLength(2);
      expect(result.sub_abc[0].estimatedDepartureTimeUtc).toBe("2026-05-04T12:05:00Z");
      expect(result.sub_abc[0].scheduledDepartureTimeUtc).toBe("2026-05-04T12:00:00Z");
      expect(result.sub_abc[0].minutes).toBe(5);
      expect(result.sub_abc[0].delayed).toBe(true);
      expect(result.sub_abc[0].isRealTime).toBe(true);
    }),
  );

  it.effect("should match route by shortName case-insensitively", () =>
    Effect.gen(function* () {
      const mockApi = {
        getBaseData: () => Effect.succeed(mockBaseData as any),
        getPatternPaths: () => Effect.succeed(mockPatternPaths as any),
        getNextDepartureTimes: () => Effect.succeed(mockDepartures as any),
      };

      const subs = [
        {
          id: "sub_abc",
          routeName: "15",
          directionName: "Outbound",
          stopName: "Kyle Field",
        },
      ];

      const result = yield* fetchDeparturesForSubscriptions(subs, mockApi as any);
      expect(Object.keys(result)).toEqual(["sub_abc"]);
    }),
  );

  it.effect("should match direction by name with destination fallback", () =>
    Effect.gen(function* () {
      const mockApi = {
        getBaseData: () => Effect.succeed(mockBaseData as any),
        getPatternPaths: () => Effect.succeed(mockPatternPaths as any),
        getNextDepartureTimes: () => Effect.succeed(mockDepartures as any),
      };

      const subs = [
        {
          id: "sub_by_destination",
          routeName: "15",
          directionName: "TO RIVERWAY",
          stopName: "Kyle Field",
        },
      ];

      const result = yield* fetchDeparturesForSubscriptions(subs, mockApi as any);
      expect(Object.keys(result)).toEqual(["sub_by_destination"]);
    }),
  );

  it.effect("should return empty object when no subscriptions", () =>
    Effect.gen(function* () {
      const mockApi = {
        getBaseData: () => Effect.succeed(mockBaseData as any),
        getPatternPaths: () => Effect.succeed(mockPatternPaths as any),
        getNextDepartureTimes: () => Effect.succeed(mockDepartures as any),
      };

      const result = yield* fetchDeparturesForSubscriptions([], mockApi as any);
      expect(result).toEqual({});
    }),
  );

  it.effect("should skip subscription when route is not found", () =>
    Effect.gen(function* () {
      const mockApi = {
        getBaseData: () => Effect.succeed(mockBaseData as any),
        getPatternPaths: () => Effect.succeed(mockPatternPaths as any),
        getNextDepartureTimes: () => Effect.succeed(mockDepartures as any),
      };

      const subs = [
        {
          id: "sub_notfound",
          routeName: "999",
          directionName: "Outbound",
          stopName: "Kyle Field",
        },
      ];

      const result = yield* fetchDeparturesForSubscriptions(subs, mockApi as any);
      expect(result).toEqual({});
    }),
  );

  it.effect("should skip subscription when direction is not found", () =>
    Effect.gen(function* () {
      const mockApi = {
        getBaseData: () => Effect.succeed(mockBaseData as any),
        getPatternPaths: () => Effect.succeed(mockPatternPaths as any),
        getNextDepartureTimes: () => Effect.succeed(mockDepartures as any),
      };

      const subs = [
        {
          id: "sub_bad_dir",
          routeName: "15",
          directionName: "Nonexistent",
          stopName: "Kyle Field",
        },
      ];

      const result = yield* fetchDeparturesForSubscriptions(subs, mockApi as any);
      expect(result).toEqual({});
    }),
  );

  it.effect("should skip subscription when stop is not found", () =>
    Effect.gen(function* () {
      const mockApi = {
        getBaseData: () => Effect.succeed(mockBaseData as any),
        getPatternPaths: () => Effect.succeed(mockPatternPaths as any),
        getNextDepartureTimes: () => Effect.succeed(mockDepartures as any),
      };

      const subs = [
        {
          id: "sub_bad_stop",
          routeName: "15",
          directionName: "Outbound",
          stopName: "Does Not Exist",
        },
      ];

      const result = yield* fetchDeparturesForSubscriptions(subs, mockApi as any);
      expect(result).toEqual({});
    }),
  );

  it.effect("should call getPatternPaths with route key not pattern keys", () =>
    Effect.gen(function* () {
      let calledWith: ReadonlyArray<any> = [];
      const mockApi = {
        getBaseData: () => Effect.succeed(mockBaseData as any),
        getPatternPaths: (routeKeys: ReadonlyArray<any>) => {
          calledWith = routeKeys;
          return Effect.succeed(mockPatternPaths as any);
        },
        getNextDepartureTimes: () => Effect.succeed(mockDepartures as any),
      };

      const subs = [
        { id: "sub_1", routeName: "15", directionName: "Outbound", stopName: "Kyle Field" },
      ];

      yield* fetchDeparturesForSubscriptions(subs, mockApi as any);

      expect(calledWith).toEqual(["route_15_key"]);
    }),
  );

  it.effect("should handle multiple subscriptions for different routes", () =>
    Effect.gen(function* () {
      const mockApi = {
        getBaseData: () => Effect.succeed(mockBaseData as any),
        getPatternPaths: () => Effect.succeed(mockPatternPaths as any),
        getNextDepartureTimes: (rdks: ReadonlyArray<any>, _stopCode: any) => {
          if (rdks[0]?.routeKey === "route_15_key") {
            return Effect.succeed(mockDepartures as any);
          }
          return Effect.succeed({
            stopCode: "2001",
            routeDirectionTimes: [
              {
                routeKey: "route_12_key",
                directionKey: "dir_12_out_key",
                nextDeparts: [
                  {
                    estimatedDepartTimeUtc: "2026-05-04T13:00:00Z",
                    scheduledDepartTimeUtc: "2026-05-04T13:00:00Z",
                    isOffRoute: false,
                  },
                ],
              },
            ],
          } as any);
        },
      };

      const subs = [
        { id: "sub_1", routeName: "15", directionName: "Outbound", stopName: "Kyle Field" },
        { id: "sub_2", routeName: "12", directionName: "Outbound", stopName: "Student Center" },
      ];

      const result = yield* fetchDeparturesForSubscriptions(subs, mockApi as any);

      expect(Object.keys(result).sort()).toEqual(["sub_1", "sub_2"]);
      expect(result.sub_1).toHaveLength(2);
      expect(result.sub_2).toHaveLength(1);
    }),
  );
});
