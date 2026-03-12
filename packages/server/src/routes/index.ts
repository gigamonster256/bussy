import { HttpRouter, HttpMiddleware } from "@effect/platform"
import { arrivalRoutes } from "./arrivals"
import { deviceRoutes } from "./devices"
import { healthRoutes } from "./health"
import { metadataRoutes } from "./metadata"
import { pushRoutes } from "./push"
import { staticRoutes } from "./static"
import { subscriptionRoutes } from "./subscriptions"

/**
 * Composed router with all API routes.
 * Routes are combined in order - static routes should be last
 * to avoid catching API routes with the /:filename pattern.
 */
export const apiRouter = HttpRouter.empty.pipe(
  HttpRouter.concat(healthRoutes),
  HttpRouter.concat(metadataRoutes),
  HttpRouter.concat(deviceRoutes),
  HttpRouter.concat(subscriptionRoutes),
  HttpRouter.concat(pushRoutes),
  HttpRouter.concat(arrivalRoutes),
  HttpRouter.concat(staticRoutes),
  HttpMiddleware.cors()
)

// Re-export individual route modules for testing
export { arrivalRoutes } from "./arrivals"
export { deviceRoutes } from "./devices"
export { healthRoutes } from "./health"
export { metadataRoutes } from "./metadata"
export { pushRoutes } from "./push"
export { staticRoutes } from "./static"
export { subscriptionRoutes } from "./subscriptions"
