import { Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"
import { AggieSpiritAuthMock } from "../mocks/AggieSpiritAuth.ts"
import { AggieSpiritAuth } from "../../src/services/AggieSpiritAuth.ts"

// Note: The Raw layer test requires TEST_PRODUCTION_API=1 to run since it calls the production API
const run_production_tests = Boolean(process.env.TEST_PRODUCTION_API)
// effect native config?
// const run_production_tests = Config.boolean("TEST_PRODUCTION_API")

describe("AggieSpiritAuth", () => {
  it("Mock returns random key on each call", async () => {
    const program = Effect.gen(function*() {
      const auth = yield* AggieSpiritAuth

      const headers1 = yield* auth.headers()
      expect(headers1).toHaveProperty("Cookie")
      expect(headers1).toHaveProperty("RequestVerificationToken")
      expect(headers1).toHaveProperty("X-Requested-With", "XMLHttpRequest")

      const headers2 = yield* auth.headers()
      expect(headers2).toHaveProperty("Cookie")
      expect(headers2).toHaveProperty("RequestVerificationToken")
      expect(headers2).toHaveProperty("X-Requested-With", "XMLHttpRequest")

      expect(headers1.RequestVerificationToken).not.toBe(headers2.RequestVerificationToken)
      expect(headers1.Cookie).not.toBe(headers2.Cookie)
    })

    await Effect.runPromise(program.pipe(Effect.provide(AggieSpiritAuthMock)))
  })

  it.skipIf(!run_production_tests)("Raw layer gets new key each call", async () => {
    const program = Effect.gen(function*() {
      const auth = yield* AggieSpiritAuth

      const headers1 = yield* auth.headers()
      expect(headers1).toHaveProperty("Cookie")
      expect(headers1).toHaveProperty("RequestVerificationToken")
      expect(headers1).toHaveProperty("X-Requested-With", "XMLHttpRequest")

      const headers2 = yield* auth.headers()
      expect(headers2).toHaveProperty("Cookie")
      expect(headers2).toHaveProperty("RequestVerificationToken")
      expect(headers2).toHaveProperty("X-Requested-With", "XMLHttpRequest")

      expect(headers1.RequestVerificationToken).not.toBe(headers2.RequestVerificationToken)
      expect(headers1.Cookie).not.toBe(headers2.Cookie)
    })

    await Effect.runPromise(program.pipe(Effect.provide(AggieSpiritAuth.Raw)))
  })

  const runCachingTest = async (layer: Layer.Layer<AggieSpiritAuth, unknown>) => {
    const program = Effect.gen(function*() {
      const auth = yield* AggieSpiritAuth

      const headers1 = yield* auth.headers()
      const headers2 = yield* auth.headers()
      const headers3 = yield* auth.headers()

      expect(headers1.RequestVerificationToken).toBe(headers2.RequestVerificationToken)
      expect(headers2.RequestVerificationToken).toBe(headers3.RequestVerificationToken)
      expect(headers1.Cookie).toBe(headers2.Cookie)
      expect(headers2.Cookie).toBe(headers3.Cookie)
    })

    await Effect.runPromise(program.pipe(Effect.provide(layer)))
  }

  it("Default layer caches the key (with mock)", async () => {
    const TestLayer = AggieSpiritAuth.DefaultWithoutDependencies.pipe(Layer.provide(AggieSpiritAuthMock))
    await runCachingTest(TestLayer)
  })

  it.skipIf(!run_production_tests)("Default layer caches the key (with raw)", async () => {
    await runCachingTest(AggieSpiritAuth.Default)
  })
})
