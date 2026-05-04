import { beforeAll, afterAll, describe, expect, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "@effect/platform";

import { AggieSpiritApi } from "../src/aggie-spirit";
import { AggieSpiritApiMock, setupMockFetch } from "./mock";

const shouldRunLive = process.env.AGGIE_SPIRIT_LIVE === "true";

let restoreFetch: (() => void) | undefined;

beforeAll(() => {
  restoreFetch = setupMockFetch();
});
afterAll(() => restoreFetch?.());

function baseDataTests(it: any) {
  it.effect("should fetch base data with routes", () =>
    Effect.gen(function* () {
      const api = yield* AggieSpiritApi;
      const result = yield* api.getBaseData();

      expect(result.routes).toBeDefined();
      expect(Array.isArray(result.routes)).toBe(true);
      expect(result.routes.length).toBeGreaterThan(0);
    }),
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
    }),
  );
}

layer(AggieSpiritApiMock)("AggieSpiritApi.getBaseData (mock)", (it) => {
  baseDataTests(it);
});

const LiveLayer = Layer.provide(AggieSpiritApi.Default, FetchHttpClient.layer);
describe.runIf(shouldRunLive)("AggieSpiritApi.getBaseData (live)", () => {
  layer(LiveLayer, { excludeTestServices: true })("tests", (it) => {
    baseDataTests(it);
  });
});
