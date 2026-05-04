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

function vehicleTests(it: any) {
  it.effect("should fetch vehicles with valid structure", () =>
    Effect.gen(function* () {
      const api = yield* AggieSpiritApi;
      const result = yield* api.getVehicles([testRouteKey]);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const entry = result[0];
      expect(entry.routeKey).toBeDefined();
      expect(Array.isArray(entry.vehiclesByDirections)).toBe(true);
    }),
  );

  it.effect("should return vehicles with location data", () =>
    Effect.gen(function* () {
      const api = yield* AggieSpiritApi;
      const result = yield* api.getVehicles([testRouteKey]);

      for (const entry of result) {
        for (const vbd of entry.vehiclesByDirections) {
          for (const vehicle of vbd.vehicles) {
            expect(typeof vehicle.location.latitude).toBe("number");
            expect(typeof vehicle.location.longitude).toBe("number");
            expect(typeof vehicle.location.speed).toBe("number");
          }
        }
      }
    }),
  );
}

layer(AggieSpiritApiMock)("AggieSpiritApi.getVehicles (mock)", (it) => {
  vehicleTests(it);
});

const LiveLayer = Layer.provide(AggieSpiritApi.Default, FetchHttpClient.layer);
describe.runIf(shouldRunLive)("AggieSpiritApi.getVehicles (live)", () => {
  layer(LiveLayer, { excludeTestServices: true })("tests", (it) => {
    vehicleTests(it);
  });
});
