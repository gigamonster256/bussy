/**
 * Build script for the Solid.js client using Bun's bundler.
 * Uses Babel with babel-preset-solid for JSX transformation.
 * Uses Tailwind CSS via PostCSS for styling.
 * Generates content-hashed filenames for cache busting.
 */
import { transformAsync } from "@babel/core"
import tailwindcss from "@tailwindcss/postcss"
import autoprefixer from "autoprefixer"
import { type BunPlugin } from "bun"
import { readdirSync, rmSync, watch } from "node:fs"
import postcss from "postcss"

const solidPlugin: BunPlugin = {
  name: "solid",
  async setup(build) {
    build.onLoad({ filter: /\.[tj]sx$/ }, async (args) => {
      const text = await Bun.file(args.path).text()

      const result = await transformAsync(text, {
        filename: args.path,
        presets: [
          ["@babel/preset-typescript", { isTSX: true, allExtensions: true }],
          ["babel-preset-solid", { generate: "dom", hydratable: false }]
        ],
        plugins: [],
        sourceMaps: "inline"
      })

      return {
        contents: result?.code ?? text,
        loader: "js"
      }
    })
  }
}

const isDev = process.argv.includes("--dev")
const isWatch = process.argv.includes("--watch")

// Get version from environment variable (for Nix builds) or package.json
const packageJson = await Bun.file("./package.json").json()
const APP_VERSION = process.env.APP_VERSION ?? packageJson.version ?? "0.0.0"

// Manifest to track hashed filenames
const manifest: Record<string, string> = {}

// Helper to generate content hash
function contentHash(content: string | Uint8Array): string {
  const hasher = new Bun.CryptoHasher("sha256")
  hasher.update(content)
  return hasher.digest("hex").slice(0, 8)
}

async function buildCSS() {
  console.log("Building CSS with Tailwind...")

  const inputPath = "./src/client/style.css"

  const css = await Bun.file(inputPath).text()

  const processor = postcss([tailwindcss(), autoprefixer()])

  const result = await processor.process(css, {
    from: inputPath,
    to: "./dist/client/style.css"
  })

  // Minify if production
  let outputCSS = result.css
  if (!isDev) {
    // Basic minification - remove comments and extra whitespace
    outputCSS = outputCSS
      .replace(/\/\*[\s\S]*?\*\//g, "") // Remove comments
      .replace(/\s+/g, " ") // Collapse whitespace
      .replace(/\s*([{}:;,])\s*/g, "$1") // Remove space around special chars
      .replace(/;}/g, "}") // Remove trailing semicolons
      .trim()
  }

  // Generate hashed filename (only in production)
  const filename = isDev ? "style.css" : `style.${contentHash(outputCSS)}.css`
  const outputPath = `./dist/client/${filename}`

  await Bun.write(outputPath, outputCSS)
  manifest["style.css"] = filename

  const size = new Blob([outputCSS]).size
  console.log(`  - ${outputPath} (${(size / 1024).toFixed(2)} KB)`)
}

async function buildFavicons() {
  console.log("Building favicons...")

  const inputPath = "./src/client/favicon.svg"
  const outDir = "./dist/client"

  // Copy the SVG
  await Bun.write(`${outDir}/favicon.svg`, Bun.file(inputPath))
  console.log(`  - ${outDir}/favicon.svg`)

  // Check if ImageMagick is available by trying to run it
  let hasMagick = false
  try {
    const testProc = Bun.spawn(["magick", "--version"], { stdout: "ignore", stderr: "ignore" })
    await testProc.exited
    hasMagick = testProc.exitCode === 0
  } catch {
    hasMagick = false
  }

  if (!hasMagick) {
    console.log("  (skipping PNG/ICO generation - ImageMagick not found)")
    return
  }

  // Generate PNGs and ICO using ImageMagick
  const sizes = [
    { name: "favicon-16.png", size: 16 },
    { name: "favicon-32.png", size: 32 },
    { name: "apple-touch-icon.png", size: 180 }
  ]

  for (const { name, size } of sizes) {
    const proc = Bun.spawn([
      "magick",
      "-background", "none",
      inputPath,
      "-resize", `${size}x${size}`,
      `${outDir}/${name}`
    ])
    await proc.exited
    if (proc.exitCode !== 0) {
      console.error(`  Failed to generate ${name}`)
      process.exit(1)
    }
    const fileSize = Bun.file(`${outDir}/${name}`).size
    console.log(`  - ${outDir}/${name} (${(fileSize / 1024).toFixed(2)} KB)`)
  }

  // Generate ICO (contains 16x16 and 32x32)
  const icoProc = Bun.spawn([
    "magick",
    `${outDir}/favicon-16.png`,
    `${outDir}/favicon-32.png`,
    `${outDir}/favicon.ico`
  ])
  await icoProc.exited
  if (icoProc.exitCode !== 0) {
    console.error("  Failed to generate favicon.ico")
    process.exit(1)
  }
  const icoSize = Bun.file(`${outDir}/favicon.ico`).size
  console.log(`  - ${outDir}/favicon.ico (${(icoSize / 1024).toFixed(2)} KB)`)
}

async function buildClient() {
  console.log(`Building client (${isDev ? "development" : "production"})...`)

  // Clean up old hashed files (but keep sw.js)
  try {
    const files = readdirSync("./dist/client")
    for (const file of files) {
      // Remove old hashed JS and CSS files, and old manifest
      if (
        (file.startsWith("index.") && file.endsWith(".js")) ||
        (file.startsWith("style.") && file.endsWith(".css")) ||
        file === "manifest.json"
      ) {
        rmSync(`./dist/client/${file}`)
      }
    }
  } catch {
    // Directory doesn't exist yet, that's fine
  }

  // Build main app with naming that includes content hash
  const result = await Bun.build({
    entrypoints: ["./src/client/index.tsx"],
    outdir: "./dist/client",
    target: "browser",
    format: "esm",
    plugins: [solidPlugin],
    minify: !isDev,
    sourcemap: isDev ? "inline" : "none",
    naming: isDev ? "[name].[ext]" : "[name].[hash].[ext]",
    define: {
      "process.env.NODE_ENV": isDev ? "\"development\"" : "\"production\"",
      "__APP_VERSION__": JSON.stringify(APP_VERSION)
    }
  })

  if (!result.success) {
    console.error("Build failed:")
    for (const log of result.logs) {
      console.error(log)
    }
    process.exit(1)
  }

  console.log(`Built ${result.outputs.length} files to dist/client/`)
  for (const output of result.outputs) {
    const filename = output.path.split("/").pop()!
    console.log(`  - ${output.path} (${(output.size / 1024).toFixed(2)} KB)`)
    // Track the hashed filename (index.HASH.js -> app.js in manifest)
    if (filename.startsWith("index.")) {
      manifest["app.js"] = filename
    }
  }

  // Build service worker (no hash - it needs a stable URL)
  const swResult = await Bun.build({
    entrypoints: ["./src/client/sw.ts"],
    outdir: "./dist/client",
    target: "browser",
    format: "esm",
    minify: !isDev,
    sourcemap: isDev ? "inline" : "none"
  })

  if (!swResult.success) {
    console.error("Service worker build failed:")
    for (const log of swResult.logs) {
      console.error(log)
    }
    process.exit(1)
  }

  console.log(`Built service worker:`)
  for (const output of swResult.outputs) {
    console.log(`  - ${output.path} (${(output.size / 1024).toFixed(2)} KB)`)
  }

  // Build CSS
  await buildCSS()

  // Build favicons from SVG
  await buildFavicons()

  // Build index.html with asset paths substituted
  await buildHTML()

  // Write manifest for server to read
  await Bun.write("./dist/client/manifest.json", JSON.stringify(manifest, null, 2))
  console.log(`\nManifest:`, manifest)
}

async function buildHTML() {
  console.log("Building HTML...")

  const inputPath = "./src/client/index.html"
  let html = await Bun.file(inputPath).text()

  // Replace placeholder asset paths with actual (possibly hashed) filenames
  const appJs = manifest["app.js"] ?? "index.js"
  const styleCss = manifest["style.css"] ?? "style.css"

  html = html.replace("/app.js", `/${appJs}`)
  html = html.replace("/style.css", `/${styleCss}`)

  const outputPath = "./dist/client/index.html"
  await Bun.write(outputPath, html)

  const size = new Blob([html]).size
  console.log(`  - ${outputPath} (${(size / 1024).toFixed(2)} KB)`)
}

// Initial build
await buildClient()

// Watch mode for development
if (isWatch) {
  console.log("\nWatching for changes in src/client...")

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let isBuilding = false

  const rebuild = async () => {
    if (isBuilding) return
    isBuilding = true
    console.log("\n--- Rebuilding client... ---")
    try {
      await buildClient()
      console.log("--- Rebuild complete ---\n")
    } catch (err) {
      console.error("Rebuild failed:", err)
    }
    isBuilding = false
  }

  const debouncedRebuild = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(rebuild, 100)
  }

  // Watch client source directory
  watch("./src/client", { recursive: true }, (_event, filename) => {
    if (
      filename &&
      (filename.endsWith(".ts") || filename.endsWith(".tsx") || filename.endsWith(".css") || filename.endsWith(".html"))
    ) {
      console.log(`File changed: ${filename}`)
      debouncedRebuild()
    }
  })

  // Keep the process alive
  process.on("SIGINT", () => {
    console.log("\nStopping watch mode...")
    process.exit(0)
  })
}
