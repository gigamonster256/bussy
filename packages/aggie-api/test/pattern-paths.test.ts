import { beforeAll, afterAll, describe, expect, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { FetchHttpClient } from "@effect/platform";

import { AggieSpiritApi } from "../src/aggie-spirit";
import { AggieSpiritApiMock, setupMockFetch } from "./mock";
import { RouteKeySchema } from "../src/schemas";

const testRouteKey = Schema.decodeSync(RouteKeySchema)("01");

const shouldRunLive = process.env.AGGIE_SPIRIT_LIVE === "true";

let restoreFetch: (() => void) | undefined;

beforeAll(() => {
  restoreFetch = setupMockFetch();
});
afterAll(() => restoreFetch?.());

function patternPathTests(it: any) {
  it.effect("should fetch pattern paths with valid structure", () =>
    Effect.gen(function* () {
      const api = yield* AggieSpiritApi;
      const result = yield* api.getPatternPaths([testRouteKey]);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const entry = result[0];
      expect(entry.routeKey).toBeDefined();
      expect(Array.isArray(entry.patternPaths)).toBe(true);
    }),
  );

  it.effect("should return pattern points with coordinates", () =>
    Effect.gen(function* () {
      const api = yield* AggieSpiritApi;
      const result = yield* api.getPatternPaths([testRouteKey]);

      for (const entry of result) {
        for (const path of entry.patternPaths) {
          for (const point of path.patternPoints) {
            expect(typeof point.latitude).toBe("number");
            expect(typeof point.longitude).toBe("number");
          }
        }
      }
    }),
  );
}

layer(AggieSpiritApiMock)("AggieSpiritApi.getPatternPaths (mock)", (it) => {
  patternPathTests(it);
});

const LiveLayer = Layer.provide(AggieSpiritApi.Default, FetchHttpClient.layer);
describe.runIf(shouldRunLive)("AggieSpiritApi.getPatternPaths (live)", () => {
  layer(LiveLayer, { excludeTestServices: true })("tests", (it) => {
    patternPathTests(it);
  });
});
