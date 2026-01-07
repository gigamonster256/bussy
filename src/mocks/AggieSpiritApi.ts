import { Effect, Layer } from "effect"
import type { Arrival, Route, Stop } from "../domain.js"
import { AggieSpiritApi } from "../services/AggieSpiritApi.js"

/**
 * Creates a mock AggieSpiritApi Layer for testing
 */
export const makeAggieSpiritApiMock = (
  mockRoutes: Array<Route>,
  mockStops: Array<Stop>,
  mockArrivals: Array<Arrival> = []
) => {
  const service = AggieSpiritApi.make({
    getBaseData: () => Effect.succeed(mockRoutes),

    getPatternPaths: (routeId: string, patternIds: Array<string>) =>
      Effect.succeed(
        patternIds.map((patternId) => ({
          patternId,
          directionId: "d1",
          geometry: [] as Array<{ lat: number; lon: number; stopCode: string | undefined }>,
          stops: mockStops.map((s) => ({
            code: s.code,
            name: s.name,
            location: s.location ?? { lat: 0, lon: 0 }
          }))
        }))
      ),

    getNextDepartureTimes: (routeId: string, directionIds: Array<string>, stopCode: string) =>
      Effect.succeed(
        mockArrivals.filter(
          (a) => a.routeId === routeId && directionIds.includes(a.directionId) && a.stopCode === stopCode
        )
      )
  })

  return Layer.succeed(AggieSpiritApi, service)
}
