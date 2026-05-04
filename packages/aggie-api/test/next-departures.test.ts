import { beforeAll, afterAll, describe, expect, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { FetchHttpClient } from "@effect/platform";

import { AggieSpiritApi } from "../src/aggie-spirit";
import { AggieSpiritApiMock, setupMockFetch } from "./mock";
import { RouteKeySchema, DirectionKeySchema, StopCodeSchema } from "../src/schemas";

const testRouteKey = Schema.decodeSync(RouteKeySchema)("01");
const testDirectionKey = Schema.decodeSync(DirectionKeySchema)("01_inbound");
const testStopCode = Schema.decodeSync(StopCodeSchema)("1001");

const shouldRunLive = process.env.AGGIE_SPIRIT_LIVE === "true";

let restoreFetch: (() => void) | undefined;

beforeAll(() => {
  restoreFetch = setupMockFetch();
});
afterAll(() => restoreFetch?.());

function departureTests(it: any) {
  it.effect("should fetch next departure times", () =>
    Effect.gen(function* () {
      const api = yield* AggieSpiritApi;
      const result = yield* api.getNextDepartureTimes(
        [{ routeKey: testRouteKey, directionKey: testDirectionKey }],
        testStopCode,
      );

      expect(result.stopCode).toBeDefined();
      expect(Array.isArray(result.routeDirectionTimes)).toBe(true);
      expect(result.routeDirectionTimes.length).toBeGreaterThan(0);
    }),
  );

  it.effect("should return departure times with valid structure", () =>
    Effect.gen(function* () {
      const api = yield* AggieSpiritApi;
      const result = yield* api.getNextDepartureTimes(
        [{ routeKey: testRouteKey, directionKey: testDirectionKey }],
        testStopCode,
      );

      for (const rdt of result.routeDirectionTimes) {
        expect(typeof rdt.routeKey).toBe("string");
        expect(typeof rdt.directionKey).toBe("string");
        expect(Array.isArray(rdt.nextDeparts)).toBe(true);
      }
    }),
  );
}

layer(AggieSpiritApiMock)("AggieSpiritApi.getNextDepartureTimes (mock)", (it) => {
  departureTests(it);
});

const LiveLayer = Layer.provide(AggieSpiritApi.Default, FetchHttpClient.layer);
describe.runIf(shouldRunLive)("AggieSpiritApi.getNextDepartureTimes (live)", () => {
  layer(LiveLayer, { excludeTestServices: true })("tests", (it) => {
    departureTests(it);
  });
});
