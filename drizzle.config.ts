import { defineConfig } from "drizzle-kit"

/**
 * Drizzle Kit configuration for MySQL/MariaDB
 */
export default defineConfig({
  schema: "./src/db/schema/mysql.ts",
  out: "./drizzle",
  dialect: "mysql",
  // dbCredentials: {
  //   url: process.env.DATABASE_URL || "mysql://root:password@localhost:3306/bussy"
  // }
})

