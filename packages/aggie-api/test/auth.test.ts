import { beforeAll, afterAll, expect, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";

import { AggieSpiritAuth } from "../src/auth";
import { setupMockFetch } from "./mock";

let restoreFetch: (() => void) | undefined;

beforeAll(() => {
  restoreFetch = setupMockFetch();
});
afterAll(() => restoreFetch?.());

const CachedLayer = AggieSpiritAuth.DefaultWithoutDependencies.pipe(
  Layer.provide(AggieSpiritAuth.Raw),
);

layer(AggieSpiritAuth.Raw)("AggieSpiritAuth.Raw", (it) => {
  it.effect("should return auth headers", () =>
    Effect.gen(function* () {
      const auth = yield* AggieSpiritAuth;
      const headers = yield* auth.headers();

      expect(headers.Cookie).toContain("ASP.NET_SessionId");
      expect(headers.RequestVerificationToken).toBeDefined();
      expect(headers["X-Requested-With"]).toBe("XMLHttpRequest");
    }),
  );
});

layer(CachedLayer)("AggieSpiritAuth cached", (it) => {
  it.effect("should cache auth headers", () =>
    Effect.gen(function* () {
      const auth = yield* AggieSpiritAuth;
      const h1 = yield* auth.headers();
      const h2 = yield* auth.headers();

      expect(h1).toEqual(h2);
    }),
  );
});
