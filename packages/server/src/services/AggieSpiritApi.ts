import { DateTime, Effect } from "effect"
import type { Arrival, Direction, Pattern, Route } from "../shared/domain"
import { AggieSpiritAuth } from "./AggieSpiritAuth.ts"

import * as api from "aggie-spirit-api"

// Local interface definitions matching aggie-spirit-api runtime objects
// (Types are not exported from the package index)
interface ApiBaseDataResponse {
  routes: Array<{
    key: string
    name: string
    shortName: string
    directionList: Array<{
      direction: {
        key: string
        name: string
      }
      destination: string
      patternList: Array<{
        key: string
        isDisplay: boolean
      }>
    }>
  }>
}

interface ApiNextDepartureTimesResponse {
  stopCode: string
  routeDirectionTimes: Array<{
    routeKey: string
    directionKey: string
    nextDeparts: Array<{
      estimatedDepartTimeUtc: string | null
      scheduledDepartTimeUtc: string | null
      isOffRoute: boolean
    }>
  }>
}

interface ApiPatternPathsResponse {
  routeKey: string
  patternPaths: Array<{
    patternKey: string
    directionKey: string
    patternPoints: Array<{
      key: string
      latitude: number
      longitude: number
      stop: {
        name: string
        stopCode: string
        stopType: number
      } | null
    }>
  }>
}

export class AggieSpiritApi extends Effect.Service<AggieSpiritApi>()("AggieSpiritApi", {
  effect: Effect.gen(function*() {
    const auth = yield* AggieSpiritAuth
    return {
      getBaseData: Effect.fn("AggieSpiritApi.getBaseData")(function*() {
        const headers = yield* auth.headers()
        const raw = (yield* Effect.promise(() => api.getBaseData(headers)).pipe(
          Effect.withSpan("aggie-spirit-api.getBaseData")
        )) as unknown as ApiBaseDataResponse

        // Normalize to domain types
        return raw.routes.map((r): Route => ({
          id: r.key,
          name: r.name,
          shortName: r.shortName,
          directionList: r.directionList.map((d): Direction => ({
            id: d.direction.key,
            name: d.direction.name,
            destination: d.destination,
            patternList: d.patternList.map((p): Pattern => ({
              id: p.key,
              isDisplay: p.isDisplay,
              geometry: [] // We don't have geometry in base data, would need getPatternPaths if desired
            }))
          }))
        }))
      }),

      getPatternPaths: Effect.fn("AggieSpiritApi.getPatternPaths")(
        function*(routeId: string, patternIds: Array<string>) {
          const headers = yield* auth.headers()
          // api.getPatternPaths takes (routeKey, auth)
          const raw = (yield* Effect.promise(() => api.getPatternPaths([routeId], headers)).pipe(
            Effect.withSpan("aggie-spirit-api.getPatternPaths", {
              attributes: { routeId, patternIds: patternIds.join(",") }
            })
          )) as unknown as [ApiPatternPathsResponse]

          // We can normalize this to a simpler structure or just return the geometry/stops map
          // For now, let's return a map of patternId -> { geometry: Point[], stops: Stop[] }
          return raw[0].patternPaths.map((pp) => ({
            patternId: pp.patternKey,
            directionId: pp.directionKey,
            geometry: pp.patternPoints.map((p) => ({
              lat: p.latitude,
              lon: p.longitude,
              stopCode: p.stop?.stopCode
            })),
            stops: pp.patternPoints
              .filter((p) => p.stop !== null)
              .map((p) => ({
                code: p.stop!.stopCode,
                name: p.stop!.name,
                location: { lat: p.latitude, lon: p.longitude }
              }))
          }))
        }
      ),

      getNextDepartureTimes: Effect.fn("AggieSpiritApi.getNextDepartureTimes")(
        function*(routeId: string, directionIds: Array<string>, stopCode: string) {
          const headers = yield* auth.headers()
          const raw = (yield* Effect.promise(() =>
            api.getNextDepartureTimes(routeId, directionIds, stopCode, headers)
          ).pipe(
            Effect.withSpan("aggie-spirit-api.getNextDepartureTimes", { attributes: { routeId, stopCode } })
          )) as unknown as ApiNextDepartureTimesResponse

          // console.log("Raw next departure times:", JSON.stringify(raw))

          const arrivals: Array<Arrival> = []

          // // test data
          //       const est = DateTime.unsafeMake(new Date("2026-01-08T05:06:49.710Z"))
          //       const sch = DateTime.unsafeMake(new Date(Date.now() + 5 * 60000))
          //       arrivals.push({
          //         routeId,
          //         directionId: directionIds[0],
          //         stopCode,
          //         estimatedDepartTimeUtc: est,
          //         scheduledDepartTimeUtc: sch,
          //         isRealtime: true,
          //         isOffRoute: false
          //       })
          //       console.log("Added test arrival:", JSON.stringify(arrivals[arrivals.length - 1]))

          for (const rdt of raw.routeDirectionTimes) {
            for (const next of rdt.nextDeparts) {
              if (next.estimatedDepartTimeUtc) {
                const est = DateTime.unsafeMake(new Date(next.estimatedDepartTimeUtc))
                const sch = next.scheduledDepartTimeUtc
                  ? DateTime.unsafeMake(new Date(next.scheduledDepartTimeUtc))
                  : undefined

                arrivals.push({
                  routeId: rdt.routeKey,
                  directionId: rdt.directionKey,
                  stopCode: raw.stopCode,
                  estimatedDepartTimeUtc: est,
                  scheduledDepartTimeUtc: sch,
                  isRealtime: !!next.estimatedDepartTimeUtc, // If we have an estimate, it's realtime-ish
                  isOffRoute: next.isOffRoute
                })
              }
            }
          }

          // console.log("Normalized arrivals:", JSON.stringify(arrivals))

          return arrivals
        }
      )
    }
  }),
  dependencies: [AggieSpiritAuth.Default]
}) {}
