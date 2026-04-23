import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import * as it from "@effect/vitest";

it.addEqualityTesters();

const testDbUrl = process.env.TEST_DATABASE_URL ?? "mysql://bussy:bussy@localhost:3306/bussy_test";

beforeAll(async () => {
  const pool = mysql.createPool(testDbUrl);
  const db = drizzle({ client: pool });

  await migrate(db, { migrationsFolder: "./migrations" });

  await pool.end();
});
