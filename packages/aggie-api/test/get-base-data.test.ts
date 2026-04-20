import { describe, it, expect } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "@effect/platform";

import { AggieSpiritApi } from "../src/aggie-spirit";

const TestLayer = Layer.mergeAll(AggieSpiritApi.Default, FetchHttpClient.layer);

describe("AggieSpiritApi.getBaseData", () => {
  it.effect("should fetch base data from real endpoint", () =>
    Effect.gen(function* () {
      const api = yield* AggieSpiritApi;
      const result = yield* api.getBaseData();

      expect(result.routes).toBeDefined();
      expect(Array.isArray(result.routes)).toBe(true);
      expect(result.routes.length).toBeGreaterThan(0);

      const firstRoute = result.routes[0];
      expect(firstRoute).toBeDefined();
      expect(firstRoute?.key).toBeDefined();
      expect(firstRoute?.name).toBeDefined();
      expect(firstRoute?.shortName).toBeDefined();
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("should return routes with valid structure", () =>
    Effect.gen(function* () {
      const api = yield* AggieSpiritApi;
      const result = yield* api.getBaseData();

      for (const route of result.routes) {
        expect(typeof route.key).toBe("string");
        expect(route.key.length).toBeGreaterThan(0);
        expect(typeof route.name).toBe("string");
        expect(route.name.length).toBeGreaterThan(0);
        expect(typeof route.shortName).toBe("string");
      }
    }).pipe(Effect.provide(TestLayer)),
  );
});
