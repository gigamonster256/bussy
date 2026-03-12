import { HttpRouter, HttpServerResponse } from "@effect/platform"

/**
 * Health check route
 */
export const healthRoutes = HttpRouter.empty.pipe(
  HttpRouter.get("/api/v1/health", HttpServerResponse.json({ status: "ok" }))
)