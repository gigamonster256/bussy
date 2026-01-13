import { Effect, Layer } from "effect"
import { AggieSpiritApi } from "../../src/services/AggieSpiritApi.ts"
import type { Arrival, Route, Stop } from "../../src/shared/domain.ts"

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
        patternIds.map((patternId) => {
          // Find the direction that owns this pattern so we return the correct directionId
          const route = mockRoutes.find((r) => r.id === routeId)
          const direction = route?.directionList.find((d) => d.patternList.some((p) => p.id === patternId))
          return {
            patternId,
            directionId: direction?.id ?? "d1",
            geometry: [] as Array<{ lat: number; lon: number; stopCode: string | undefined }>,
            stops: mockStops.map((s) => ({
              code: s.code,
              name: s.name,
              location: s.location ?? { lat: 0, lon: 0 }
            }))
          }
        })
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
