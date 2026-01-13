import { HttpRouter } from "@effect/platform"
import { arrivalRoutes } from "./arrivals.ts"
import { deviceRoutes } from "./devices.ts"
import { healthRoutes } from "./health.ts"
import { metadataRoutes } from "./metadata.ts"
import { pushRoutes } from "./push.ts"
import { staticRoutes } from "./static.ts"
import { subscriptionRoutes } from "./subscriptions.ts"

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
  HttpRouter.concat(staticRoutes)
)

// Re-export individual route modules for testing
export { arrivalRoutes } from "./arrivals.ts"
export { deviceRoutes } from "./devices.ts"
export { healthRoutes } from "./health.ts"
export { metadataRoutes } from "./metadata.ts"
export { pushRoutes } from "./push.ts"
export { staticRoutes } from "./static.ts"
export { subscriptionRoutes } from "./subscriptions.ts"
