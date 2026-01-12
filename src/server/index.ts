import { HttpRouter, HttpServer, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { BunHttpServer } from "@effect/platform-bun"
import { Config, Context, Effect, Layer } from "effect"
import { DatabaseService, type Subscription as DbSubscription } from "../db/index.ts"
import { AggieSpiritApi } from "../services/AggieSpiritApi.ts"
import { MetadataCache } from "../services/MetadataCache.ts"
import { WebPushService } from "../services/WebPushService.ts"
import { arrivalToResponse } from "../shared/api.ts"
import type { CreateSubscriptionRequest, RegisterPushRequest, SubscriptionResponse } from "../shared/api.ts"

// Helper to convert DB subscription to API response
const dbSubToResponse = (sub: DbSubscription): SubscriptionResponse => ({
  id: String(sub.id),
  deviceId: sub.deviceId,
  routeId: sub.routeId,
  directionId: sub.directionId,
  stopId: sub.stopId,
  notifyMinutes: sub.notifyMinutes,
  timeRangeStart: sub.timeRangeStart,
  timeRangeEnd: sub.timeRangeEnd,
  routeName: sub.routeName,
  directionName: sub.directionName,
  stopName: sub.stopName,
  createdAt: sub.createdAt.toISOString()
})

/**
 * Helper to build the router.
 * Returns an HttpRouter that can be used as an HttpApp.
 */
const makeRouter = (
  api: AggieSpiritApi,
  cache: MetadataCache,
  database: DatabaseService
) =>
  HttpRouter.empty.pipe(
    // REST Endpoints
    HttpRouter.get("/api/v1/health", HttpServerResponse.json({ status: "ok" })),
    HttpRouter.get(
      "/api/v1/routes",
      Effect.gen(function*() {
        const routes = yield* cache.getRoutes()
        return yield* HttpServerResponse.json(routes)
      }).pipe(
        Effect.catchAllDefect((defect) =>
          Effect.gen(function*() {
            yield* Effect.logError(`GET /api/v1/routes defect: ${defect}`)
            return yield* HttpServerResponse.json(
              { error: "INTERNAL_ERROR", message: String(defect), statusCode: 500 },
              { status: 500 }
            )
          })
        )
      )
    ),
    HttpRouter.get(
      "/api/v1/routes/:routeId/directions",
      Effect.gen(function*() {
        const { routeId } = yield* HttpRouter.params
        const directions = yield* cache.getDirections(routeId!)
        return yield* HttpServerResponse.json(directions)
      }).pipe(
        Effect.catchAllDefect((defect) =>
          Effect.gen(function*() {
            yield* Effect.logError(`GET /api/v1/routes/:routeId/directions defect: ${defect}`)
            return yield* HttpServerResponse.json(
              { error: "INTERNAL_ERROR", message: String(defect), statusCode: 500 },
              { status: 500 }
            )
          })
        )
      )
    ),
    HttpRouter.get(
      "/api/v1/routes/:routeId/directions/:directionId/stops",
      Effect.gen(function*() {
        const { directionId, routeId } = yield* HttpRouter.params
        const stops = yield* cache.getStops(routeId!, directionId!)
        return yield* HttpServerResponse.json(stops)
      }).pipe(
        Effect.catchAllDefect((defect) =>
          Effect.gen(function*() {
            yield* Effect.logError(`GET /api/v1/routes/:routeId/directions/:directionId/stops defect: ${defect}`)
            return yield* HttpServerResponse.json(
              { error: "INTERNAL_ERROR", message: String(defect), statusCode: 500 },
              { status: 500 }
            )
          })
        )
      )
    ),
    // ========================================================================
    // Device Registration
    // ========================================================================
    HttpRouter.post(
      "/api/v1/devices",
      Effect.gen(function*() {
        const req = yield* HttpServerRequest.HttpServerRequest
        const body = yield* req.json as Effect.Effect<{ deviceId: string }>

        yield* Effect.logDebug(`Device registration request for: ${body.deviceId || "(missing)"}`)

        if (!body.deviceId) {
          yield* Effect.logWarning("Device registration failed: missing deviceId")
          return yield* HttpServerResponse.json(
            { error: "BAD_REQUEST", message: "deviceId is required", statusCode: 400 },
            { status: 400 }
          )
        }

        yield* Effect.logDebug(`Upserting device: ${body.deviceId}`)
        const device = yield* database.upsertDevice(body.deviceId)
        yield* Effect.logInfo(`Device registered: ${device.id}`)

        return yield* HttpServerResponse.json({
          deviceId: device.id,
          createdAt: device.createdAt.toISOString()
        })
      }).pipe(
        Effect.catchAllDefect((defect) =>
          Effect.gen(function*() {
            yield* Effect.logError(`Device registration defect: ${defect}`)
            return yield* HttpServerResponse.json(
              { error: "INTERNAL_ERROR", message: String(defect), statusCode: 500 },
              { status: 500 }
            )
          })
        )
      )
    ),
    // DELETE /api/v1/devices/:deviceId - Delete a device and all its subscriptions
    HttpRouter.del(
      "/api/v1/devices/:deviceId",
      Effect.gen(function*() {
        const { deviceId } = yield* HttpRouter.params

        yield* Effect.logDebug(`Device delete request for: ${deviceId}`)

        // Check if device exists
        const device = yield* database.getDevice(deviceId!)
        if (!device) {
          yield* Effect.logWarning(`Device delete failed: device not found: ${deviceId}`)
          return yield* HttpServerResponse.json(
            { error: "NOT_FOUND", message: "Device not found", statusCode: 404 },
            { status: 404 }
          )
        }

        // Delete device and all associated data
        yield* Effect.logDebug(`Deleting device and subscriptions: ${deviceId}`)
        yield* database.deleteDevice(deviceId!)
        yield* Effect.logInfo(`Deleted device ${deviceId} and all associated subscriptions`)

        return yield* HttpServerResponse.json({ success: true })
      }).pipe(
        Effect.catchAllDefect((defect) =>
          Effect.gen(function*() {
            yield* Effect.logError(`Device delete defect: ${defect}`)
            return yield* HttpServerResponse.json(
              { error: "INTERNAL_ERROR", message: String(defect), statusCode: 500 },
              { status: 500 }
            )
          })
        )
      )
    ),
    // ========================================================================
    // Subscriptions CRUD
    // ========================================================================

    // GET /api/v1/devices/:deviceId/subscriptions - List all subscriptions for a device
    HttpRouter.get(
      "/api/v1/devices/:deviceId/subscriptions",
      Effect.gen(function*() {
        const { deviceId } = yield* HttpRouter.params

        const subs = yield* database.getSubscriptions(deviceId!)
        const response = subs.map(dbSubToResponse)
        return yield* HttpServerResponse.json(response)
      }).pipe(
        Effect.catchAllDefect((defect) =>
          Effect.gen(function*() {
            yield* Effect.logError(`GET /api/v1/devices/:deviceId/subscriptions defect: ${defect}`)
            return yield* HttpServerResponse.json(
              { error: "INTERNAL_ERROR", message: String(defect), statusCode: 500 },
              { status: 500 }
            )
          })
        )
      )
    ),
    // POST /api/v1/devices/:deviceId/subscriptions - Create a new subscription
    HttpRouter.post(
      "/api/v1/devices/:deviceId/subscriptions",
      Effect.gen(function*() {
        const { deviceId } = yield* HttpRouter.params
        const req = yield* HttpServerRequest.HttpServerRequest
        const body = yield* req.json as Effect.Effect<CreateSubscriptionRequest>

        // Validate required fields
        if (!body.routeId || !body.directionId || !body.stopId) {
          return yield* HttpServerResponse.json(
            { error: "BAD_REQUEST", message: "Missing required fields", statusCode: 400 },
            { status: 400 }
          )
        }

        // Ensure device exists
        yield* database.upsertDevice(deviceId!)

        // Create the subscription
        const sub = yield* database.addSubscription(deviceId!, {
          routeId: body.routeId,
          directionId: body.directionId,
          stopId: body.stopId,
          notifyMinutes: body.notifyMinutes ?? 5,
          timeRangeStart: body.timeRangeStart ?? "00:00",
          timeRangeEnd: body.timeRangeEnd ?? "23:59",
          routeName: body.routeName ?? body.routeId,
          directionName: body.directionName ?? body.directionId,
          stopName: body.stopName ?? body.stopId
        })

        yield* Effect.logInfo(`Created subscription ${sub.id} for device ${deviceId}`)
        return yield* HttpServerResponse.json(dbSubToResponse(sub), { status: 201 })
      }).pipe(
        Effect.catchAllDefect((defect) =>
          Effect.gen(function*() {
            yield* Effect.logError(`POST /api/v1/devices/:deviceId/subscriptions defect: ${defect}`)
            return yield* HttpServerResponse.json(
              { error: "INTERNAL_ERROR", message: String(defect), statusCode: 500 },
              { status: 500 }
            )
          })
        )
      )
    ),
    // GET /api/v1/subscriptions/:id - Get a single subscription
    HttpRouter.get(
      "/api/v1/subscriptions/:id",
      Effect.gen(function*() {
        const { id } = yield* HttpRouter.params

        const sub = yield* database.getSubscription(id!)
        if (!sub) {
          return yield* HttpServerResponse.json(
            { error: "NOT_FOUND", message: "Subscription not found", statusCode: 404 },
            { status: 404 }
          )
        }

        return yield* HttpServerResponse.json(dbSubToResponse(sub))
      }).pipe(
        Effect.catchAllDefect((defect) =>
          Effect.gen(function*() {
            yield* Effect.logError(`GET /api/v1/subscriptions/:id defect: ${defect}`)
            return yield* HttpServerResponse.json(
              { error: "INTERNAL_ERROR", message: String(defect), statusCode: 500 },
              { status: 500 }
            )
          })
        )
      )
    ),
    // DELETE /api/v1/subscriptions/:id - Delete a subscription
    HttpRouter.del(
      "/api/v1/subscriptions/:id",
      Effect.gen(function*() {
        const { id } = yield* HttpRouter.params

        // Check if subscription exists
        const existing = yield* database.getSubscription(id!)
        if (!existing) {
          return yield* HttpServerResponse.json(
            { error: "NOT_FOUND", message: "Subscription not found", statusCode: 404 },
            { status: 404 }
          )
        }

        yield* database.deleteSubscription(id!)
        yield* Effect.logInfo(`Deleted subscription ${id}`)

        return yield* HttpServerResponse.json({ success: true }, { status: 200 })
      }).pipe(
        Effect.catchAllDefect((defect) =>
          Effect.gen(function*() {
            yield* Effect.logError(`DELETE /api/v1/subscriptions/:id defect: ${defect}`)
            return yield* HttpServerResponse.json(
              { error: "INTERNAL_ERROR", message: String(defect), statusCode: 500 },
              { status: 500 }
            )
          })
        )
      )
    ),
    // ========================================================================
    // Push Notifications
    // ========================================================================

    // GET /api/v1/push/vapid-key - Get the VAPID public key for push registration
    HttpRouter.get(
      "/api/v1/push/vapid-key",
      Effect.gen(function*() {
        const pushService = yield* WebPushService
        const publicKey = yield* pushService.getPublicKey
        return yield* HttpServerResponse.json({ publicKey })
      }).pipe(
        Effect.catchAllDefect((defect) =>
          Effect.gen(function*() {
            yield* Effect.logError(`GET /api/v1/push/vapid-key defect: ${defect}`)
            return yield* HttpServerResponse.json(
              { error: "INTERNAL_ERROR", message: String(defect), statusCode: 500 },
              { status: 500 }
            )
          })
        )
      )
    ),
    // POST /api/v1/devices/:deviceId/push - Register a push subscription for a device
    HttpRouter.post(
      "/api/v1/devices/:deviceId/push",
      Effect.gen(function*() {
        const { deviceId } = yield* HttpRouter.params
        const req = yield* HttpServerRequest.HttpServerRequest
        const body = yield* req.json as Effect.Effect<{ subscription: RegisterPushRequest["subscription"] }>

        if (!body.subscription?.endpoint || !body.subscription?.keys) {
          return yield* HttpServerResponse.json(
            { error: "BAD_REQUEST", message: "Invalid push subscription data", statusCode: 400 },
            { status: 400 }
          )
        }

        // Update device with push subscription
        yield* database.updatePushSubscription(
          deviceId!,
          body.subscription.endpoint,
          body.subscription.keys.p256dh,
          body.subscription.keys.auth
        )

        yield* Effect.logInfo(`Push subscription registered for device ${deviceId}`)
        return yield* HttpServerResponse.json({ success: true })
      }).pipe(
        Effect.catchAllDefect((defect) =>
          Effect.gen(function*() {
            yield* Effect.logError(`POST /api/v1/devices/:deviceId/push defect: ${defect}`)
            return yield* HttpServerResponse.json(
              { error: "INTERNAL_ERROR", message: String(defect), statusCode: 500 },
              { status: 500 }
            )
          })
        )
      )
    ),
    // DELETE /api/v1/devices/:deviceId/push - Unsubscribe from push notifications
    HttpRouter.del(
      "/api/v1/devices/:deviceId/push",
      Effect.gen(function*() {
        const { deviceId } = yield* HttpRouter.params

        // Clear push subscription from device
        yield* database.updatePushSubscription(deviceId!, "", "", "")

        yield* Effect.logInfo(`Push subscription removed for device ${deviceId}`)
        return yield* HttpServerResponse.json({ success: true })
      }).pipe(
        Effect.catchAllDefect((defect) =>
          Effect.gen(function*() {
            yield* Effect.logError(`DELETE /api/v1/devices/:deviceId/push defect: ${defect}`)
            return yield* HttpServerResponse.json(
              { error: "INTERNAL_ERROR", message: String(defect), statusCode: 500 },
              { status: 500 }
            )
          })
        )
      )
    ),
    // ========================================================================
    // Arrivals
    // ========================================================================

    // GET /api/v1/routes/:routeId/directions/:directionId/stops/:stopCode/arrivals - Get arrivals for a stop
    HttpRouter.get(
      "/api/v1/routes/:routeId/directions/:directionId/stops/:stopCode/arrivals",
      Effect.gen(function*() {
        const { directionId, routeId, stopCode } = yield* HttpRouter.params

        const arrivals = yield* api.getNextDepartureTimes(routeId!, [directionId!], stopCode!)
        const response = arrivals.map(arrivalToResponse)

        return yield* HttpServerResponse.json(response)
      }).pipe(
        Effect.catchAllDefect((defect) =>
          Effect.gen(function*() {
            yield* Effect.logError(`GET /api/v1/routes/.../arrivals defect: ${defect}`)
            return yield* HttpServerResponse.json(
              { error: "INTERNAL_ERROR", message: String(defect), statusCode: 500 },
              { status: 500 }
            )
          })
        )
      )
    ),
    // GET /api/v1/devices/:deviceId/arrivals - Batch arrivals for all device subscriptions
    HttpRouter.get(
      "/api/v1/devices/:deviceId/arrivals",
      Effect.gen(function*() {
        const { deviceId } = yield* HttpRouter.params

        // Get all subscriptions for this device
        const subs = yield* database.getSubscriptions(deviceId!)

        if (subs.length === 0) {
          return yield* HttpServerResponse.json({ arrivals: {} })
        }

        // Fetch arrivals for each subscription in parallel
        const results = yield* Effect.all(
          subs.map((sub) =>
            Effect.gen(function*() {
              const arrivals = yield* api.getNextDepartureTimes(
                sub.routeId,
                [sub.directionId],
                sub.stopId
              ).pipe(
                Effect.map((arr) => arr.map(arrivalToResponse)),
                Effect.catchAll(() => Effect.succeed([]))
              )
              return { id: String(sub.id), arrivals }
            })
          ),
          { concurrency: 5 }
        )

        // Build response object
        const arrivalsMap: Record<string, typeof results[0]["arrivals"]> = {}
        for (const { arrivals, id } of results) {
          arrivalsMap[id] = arrivals
        }

        return yield* HttpServerResponse.json({ arrivals: arrivalsMap })
      }).pipe(
        Effect.catchAllDefect((defect) =>
          Effect.gen(function*() {
            yield* Effect.logError(`GET /api/v1/devices/:deviceId/arrivals defect: ${defect}`)
            return yield* HttpServerResponse.json(
              { error: "INTERNAL_ERROR", message: String(defect), statusCode: 500 },
              { status: 500 }
            )
          })
        )
      )
    ),
    // ========================================================================
    // Static Files (with cache busting)
    // ========================================================================

    // Serve index.html from built client
    HttpRouter.get(
      "/",
      Effect.gen(function*() {
        return (yield* HttpServerResponse.file("dist/client/index.html")).pipe(
          HttpServerResponse.setHeader("Content-Type", "text/html; charset=utf-8"),
          // No cache for HTML so browser always gets latest asset references
          HttpServerResponse.setHeader("Cache-Control", "no-cache")
        )
      })
    ),
    // Serve JS files (hashed in prod, stable in dev)
    HttpRouter.get(
      "/:filename",
      Effect.gen(function*() {
        const { filename } = yield* HttpRouter.params
        if (!filename) {
          return HttpServerResponse.text("Not found", { status: 404 })
        }

        // Only serve expected file types
        if (filename.endsWith(".js")) {
          const filePath = `dist/client/${filename}`
          const isHashed = filename.includes(".") && filename.split(".").length > 2 // e.g., index.abc123.js
          return (yield* HttpServerResponse.file(filePath)).pipe(
            HttpServerResponse.setHeader(
              "Cache-Control",
              isHashed ? "public, max-age=31536000, immutable" : "no-cache"
            ),
            HttpServerResponse.setHeader("Content-Type", "application/javascript")
          )
        }

        if (filename.endsWith(".css")) {
          const filePath = `dist/client/${filename}`
          const isHashed = filename.includes(".") && filename.split(".").length > 2 // e.g., style.abc123.css
          return (yield* HttpServerResponse.file(filePath)).pipe(
            HttpServerResponse.setHeader(
              "Cache-Control",
              isHashed ? "public, max-age=31536000, immutable" : "no-cache"
            ),
            HttpServerResponse.setHeader("Content-Type", "text/css")
          )
        }

        return HttpServerResponse.text("Not found", { status: 404 })
      })
    ),
    HttpRouter.get("/sw.js", HttpServerResponse.file("dist/client/sw.js"))
  )

/**
 * The HTTP router as an Effect that requires services.
 * This builds the router with dependencies and can be flattened into an HttpApp.
 */
export const HttpApp = Effect.gen(function*() {
  const api = yield* AggieSpiritApi
  const cache = yield* MetadataCache
  const database = yield* DatabaseService
  return makeRouter(api, cache, database)
})

// ============================================================================
// Server Layer - Binds to network and serves HttpApp
// ============================================================================

/**
 * Service tag for the server configuration
 */
export class ServerConfig extends Context.Tag("ServerConfig")<
  ServerConfig,
  { readonly port: number; readonly host: string }
>() {}

/**
 * Default server config from environment
 */
export const ServerConfigLive = Layer.effect(
  ServerConfig,
  Effect.gen(function*() {
    const port = yield* Config.integer("PORT").pipe(Config.withDefault(3000))
    const host = yield* Config.string("LISTEN_ADDR").pipe(Config.withDefault("127.0.0.1"))
    return { port, host }
  })
)

/**
 * Creates a server config layer with specific values (useful for testing)
 */
export const makeServerConfig = (port: number, host = "127.0.0.1") => Layer.succeed(ServerConfig, { port, host })

/**
 * The live server that binds to a port and serves HTTP requests.
 * Requires all service dependencies to be provided.
 */
export const ServerLive = Effect.gen(function*() {
  const { host, port } = yield* ServerConfig
  const router = yield* HttpApp

  yield* Effect.logInfo(`Starting HTTP server on ${host}:${port}`)

  const serverLayer = HttpServer.serve(router)

  const HttpLive = serverLayer.pipe(
    Layer.provide(BunHttpServer.layer({
      listen: host,
      port
    }))
  )

  return yield* Layer.launch(HttpLive)
})

/**
 * Dependencies required by the HTTP router
 */
export type HttpAppDependencies = AggieSpiritApi | MetadataCache | DatabaseService | WebPushService
