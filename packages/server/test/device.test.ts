import { describe, expect, it } from "@effect/vitest";
import { Cause, Effect, Layer, Option } from "effect";
import { DeviceService } from "../src/device";
import { TestDatabaseLive } from "./fixtures";

const TestLayer = DeviceService.Default.pipe(Layer.provide(TestDatabaseLive));

describe("DeviceService", () => {
  describe("create", () => {
    it.effect("should return id and token", () =>
      Effect.gen(function* () {
        const service = yield* DeviceService;
        const result = yield* service.create();

        expect(result.id).toMatch(/^dev_/);
        expect(result.token).toContain("test-token-");

        yield* service.deleteByID(result.id);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect("should generate unique ids", () =>
      Effect.gen(function* () {
        const service = yield* DeviceService;
        const results = yield* Effect.all([service.create(), service.create(), service.create()]);

        const ids = new Set(results.map((r) => r.id));
        expect(ids.size).toBe(3);

        yield* Effect.all(results.map((r) => service.deleteByID(r.id)));
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect("should generate unique tokens", () =>
      Effect.gen(function* () {
        const service = yield* DeviceService;
        const results = yield* Effect.all([service.create(), service.create()]);

        const tokens = new Set(results.map((r) => r.token));
        expect(tokens.size).toBe(2);

        yield* Effect.all(results.map((r) => service.deleteByID(r.id)));
      }).pipe(Effect.provide(TestLayer)),
    );
  });

  describe("getByID", () => {
    it.effect("should return device when found", () =>
      Effect.gen(function* () {
        const service = yield* DeviceService;
        const created = yield* service.create();
        const found = yield* service.getByID(created.id);

        expect(found.id).toBe(created.id);
        expect(found.token).toBe(created.token);

        yield* service.deleteByID(created.id);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect("should fail with NoSuchElementException when not found", () =>
      Effect.gen(function* () {
        const service = yield* DeviceService;
        const result = yield* service.getByID("dev_00000000000000000000000000").pipe(Effect.exit);

        expect(result._tag).toBe("Failure");
        if (result._tag === "Failure") {
          const error = Cause.failureOption(result.cause);
          expect(Option.isSome(error)).toBe(true);
        }
      }).pipe(Effect.provide(TestLayer)),
    );
  });

  describe("getByToken", () => {
    it.effect("should return device when found", () =>
      Effect.gen(function* () {
        const service = yield* DeviceService;
        const created = yield* service.create();
        const found = yield* service.getByToken(created.token);

        expect(found.id).toBe(created.id);
        expect(found.token).toBe(created.token);

        yield* service.deleteByID(created.id);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect("should fail with NoSuchElementException when not found", () =>
      Effect.gen(function* () {
        const service = yield* DeviceService;
        const result = yield* service.getByToken("nonexistent-token-12345").pipe(Effect.exit);

        expect(result._tag).toBe("Failure");
      }).pipe(Effect.provide(TestLayer)),
    );
  });

  describe("deleteByID", () => {
    it.effect("should delete device", () =>
      Effect.gen(function* () {
        const service = yield* DeviceService;
        const created = yield* service.create();

        yield* service.deleteByID(created.id);

        const result = yield* service.getByID(created.id).pipe(Effect.exit);
        expect(result._tag).toBe("Failure");
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect("should not throw when deleting non-existent device", () =>
      Effect.gen(function* () {
        const service = yield* DeviceService;
        yield* service.deleteByID("dev_00000000000000000000000000");
      }).pipe(Effect.provide(TestLayer)),
    );
  });
});
