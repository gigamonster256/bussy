import { defineConfig } from "drizzle-kit"

/**
 * Drizzle Kit configuration for MySQL/MariaDB
 */
export default defineConfig({
  strict: true,
  verbose: true,
  out: "./migrations",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schema: "./src/**/*.sql.ts",
});
