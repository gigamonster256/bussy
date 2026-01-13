import { HttpRouter, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"

/**
 * Static file serving routes
 */
export const staticRoutes = HttpRouter.empty.pipe(
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

  // Serve JS/CSS files (hashed in prod, stable in dev)
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

  // Service worker
  HttpRouter.get("/sw.js", HttpServerResponse.file("dist/client/sw.js"))
)
