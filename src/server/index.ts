import { HttpRouter, HttpServer, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { BunHttpServer } from "@effect/platform-bun"
import { Config, Effect, Layer, Schedule, Stream } from "effect"
import { MetadataCache } from "../services/MetadataCache.js"
import { PollingOrchestrator } from "../services/PollingOrchestrator.js"
import { SubscriptionStore } from "../services/SubscriptionStore.js"

export const ServerLive = Effect.gen(function*() {
  const cache = yield* MetadataCache
  const store = yield* SubscriptionStore
  const orchestrator = yield* PollingOrchestrator

  const router = HttpRouter.empty.pipe(
    // REST Endpoints
    HttpRouter.get("/api/health", HttpServerResponse.json({ status: "ok" })),
    HttpRouter.get(
      "/api/routes",
      Effect.gen(function*() {
        const routes = yield* cache.getRoutes
        return yield* HttpServerResponse.json(routes)
      })
    ),
    HttpRouter.get(
      "/api/routes/:routeId/directions",
      Effect.gen(function*() {
        const { routeId } = yield* HttpRouter.params
        const directions = yield* cache.getDirections(routeId!)
        return yield* HttpServerResponse.json(directions)
      })
    ),
    HttpRouter.get(
      "/api/routes/:routeId/directions/:directionId/stops",
      Effect.gen(function*() {
        const { directionId, routeId } = yield* HttpRouter.params
        const stops = yield* cache.getStops(routeId!, directionId!)
        return yield* HttpServerResponse.json(stops)
      })
    ),
    // Static files
    HttpRouter.get("/", HttpServerResponse.file("src/client/index.html")),
    HttpRouter.get("/app.js", HttpServerResponse.file("src/client/app.js")),
    HttpRouter.get("/style.css", HttpServerResponse.file("src/client/style.css")),
    // SSE Endpoint
    HttpRouter.get(
      "/sse/arrivals",
      Effect.gen(function*() {
        const req = yield* HttpServerRequest.HttpServerRequest
        const url = new URL(req.url, "http://localhost")
        const routeId = url.searchParams.get("routeId")
        const directionId = url.searchParams.get("directionId")
        const stopId = url.searchParams.get("stopId")
        const notifyMinutes = Number(url.searchParams.get("notifyMinutes") || "5")

        if (!routeId || !directionId || !stopId) {
          return HttpServerResponse.text("Missing params", { status: 400 })
        }

        const key = `${routeId}:${directionId}:${stopId}`

        const sub = {
          routeId,
          directionId,
          stopId,
          notifyMinutes,
          timeRangeStart: "00:00",
          timeRangeEnd: "23:59",
          routeName: routeId, // placeholders
          directionName: directionId,
          stopName: stopId
        }

        // Add client
        yield* store.addClient(sub)

        // Trigger immediate poll to get initial data
        yield* orchestrator.triggerPoll(key)

        // Create stream
        const stream = store.subscribe(key).pipe(
          Stream.map((payload) => JSON.stringify(payload)),
          Stream.map((data) => `data: ${data}\n\n`),
          // Cleanup
          Stream.ensuring(Effect.gen(function*() {
            yield* Effect.logDebug(`SSE Client disconnected/done for ${key}`)
            yield* store.removeClient(key)
          }))
        )

        // Heartbeat stream from schedule
        const heartbeatSchedule = Schedule.fixed(yield* Config.duration("SSE_HEARTBEAT_INTERVAL"))
        const heartbeatStream = Stream.fromSchedule(heartbeatSchedule).pipe(
          // SSE comment as heartbeat
          Stream.map(() => ": keep-alive\n\n")
        )

        // Merge data and heartbeat streams
        const mergedStream = Stream.merge(stream, heartbeatStream)

        return HttpServerResponse.stream(
          mergedStream.pipe(
            Stream.encodeText
          ),
          {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive"
            }
          }
        )
      })
    )
  )

  const serverLayer = HttpServer.serve(router)

  const HttpLive = serverLayer.pipe(
    Layer.provide(BunHttpServer.layer({
      port: 3000,
      // should be longer for SSE events
      idleTimeout: 60
    }))
  )

  return yield* Layer.launch(HttpLive)
})
