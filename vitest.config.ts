import path from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [],
  test: {
    setupFiles: [path.join(__dirname, "setupTests.ts")],
    include: ["./test/**/*.test.ts"],
    globals: true,
    // Run E2E tests sequentially since they share a server
    fileParallelism: false,
    // Increase timeout for E2E tests
    testTimeout: 30000,
    // Increase hook timeout for server startup
    hookTimeout: 30000
  },
  resolve: {
    alias: {
      "@template/basic/test": path.join(__dirname, "test"),
      "@template/basic": path.join(__dirname, "src")
    }
  },
  server: {
    watch: {
      // Ignore devenv runtime files (includes MySQL socket)
      ignored: ["**/.devenv/**"]
    }
  }
})
