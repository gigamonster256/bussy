import { HttpRouter, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"
import { existsSync } from "node:fs"

/**
 * Static file serving routes with extension-based whitelist.
 *
 * Caching strategy:
 * - HTML: no-cache (always check for updates to get latest asset references)
 * - Hashed JS/CSS: immutable, max-age=1yr (content-addressed, never changes)
 * - Non-hashed JS/CSS: no-cache (dev mode or service worker)
 * - Icons/manifest: max-age=1day (static but may update occasionally)
 */

// Whitelist of allowed extensions with MIME types and caching strategy
const STATIC_FILES: Record<
  string,
  { contentType: string; cache: "immutable" | "revalidate" | "short" }
> = {
  ".js": { contentType: "application/javascript", cache: "immutable" },
  ".css": { contentType: "text/css", cache: "immutable" },
  ".svg": { contentType: "image/svg+xml", cache: "short" },
  ".png": { contentType: "image/png", cache: "short" },
  ".ico": { contentType: "image/x-icon", cache: "short" },
  ".webmanifest": { contentType: "application/manifest+json", cache: "short" }
}

// Cache-Control header values
const CACHE_HEADERS = {
  immutable: "public, max-age=31536000, immutable", // 1 year for hashed files
  revalidate: "no-cache", // Always revalidate
  short: "public, max-age=86400" // 1 day for static assets
}

/**
 * Check if filename is content-hashed (e.g., index.abc123.js).
 * Our build generates 8-character hashes.
 */
function isHashedFilename(filename: string): boolean {
  const parts = filename.split(".")
  // Hashed files have format: name.HASH.ext where hash is 8 chars
  return parts.length >= 3 && parts[parts.length - 2].length === 8
}

/**
 * Get the file extension, handling compound extensions like .webmanifest
 */
function getExtension(filename: string): string {
  if (filename.endsWith(".webmanifest")) return ".webmanifest"
  const match = filename.match(/\.[^.]+$/)
  return match ? match[0] : ""
}

/**
 * Serve a static file with appropriate headers.
 */
function serveStaticFile(filename: string) {
  return Effect.gen(function* () {
    // Security: prevent path traversal
    if (filename.includes("/") || filename.includes("..")) {
      return HttpServerResponse.text("Not found", { status: 404 })
    }

    const ext = getExtension(filename)
    const config = STATIC_FILES[ext]

    if (!config) {
      return HttpServerResponse.text("Not found", { status: 404 })
    }

    const filePath = `dist/client/${filename}`

    // Check file exists before trying to serve
    if (!existsSync(filePath)) {
      return HttpServerResponse.text("Not found", { status: 404 })
    }

    // Determine cache strategy:
    // - Hashed files (index.abc123.js) get immutable caching
    // - Non-hashed JS/CSS (sw.js, dev mode) get revalidate
    // - Other static assets use their default (short)
    const cacheKey =
      config.cache === "immutable"
        ? isHashedFilename(filename)
          ? "immutable"
          : "revalidate"
        : config.cache

    return (yield* HttpServerResponse.file(filePath)).pipe(
      HttpServerResponse.setHeader("Content-Type", config.contentType),
      HttpServerResponse.setHeader("Cache-Control", CACHE_HEADERS[cacheKey])
    )
  })
}

export const staticRoutes = HttpRouter.empty.pipe(
  // Serve index.html at root
  HttpRouter.get(
    "/",
    Effect.gen(function* () {
      return (yield* HttpServerResponse.file("dist/client/index.html")).pipe(
        HttpServerResponse.setHeader("Content-Type", "text/html; charset=utf-8"),
        HttpServerResponse.setHeader("Cache-Control", "no-cache")
      )
    })
  ),

  // Service worker - must be at root path, always revalidate per spec
  HttpRouter.get(
    "/sw.js",
    Effect.gen(function* () {
      return (yield* HttpServerResponse.file("dist/client/sw.js")).pipe(
        HttpServerResponse.setHeader("Content-Type", "application/javascript"),
        HttpServerResponse.setHeader("Cache-Control", "no-cache")
      )
    })
  ),

  // Generic static file handler for all whitelisted extensions
  HttpRouter.get(
    "/:filename",
    Effect.gen(function* () {
      const { filename } = yield* HttpRouter.params
      if (!filename) {
        return HttpServerResponse.text("Not found", { status: 404 })
      }
      return yield* serveStaticFile(filename)
    })
  )
)
