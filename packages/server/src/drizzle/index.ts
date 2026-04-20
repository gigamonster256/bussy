import { Config, Layer } from "effect";
import { MysqlDrizzle, layerWithConfig } from "@effect/sql-drizzle/Mysql";
import { layerConfig as mysqlLayerConfig } from "@effect/sql-mysql2/MysqlClient";
import type { DrizzleConfig } from "drizzle-orm";

const mysqlConfig = {
  url: Config.redacted("DATABASE_URL"),
};

const MysqlLive = mysqlLayerConfig(mysqlConfig);

const drizzleConfig: DrizzleConfig = {
  // logger: true,
};

const DrizzleLive = layerWithConfig(drizzleConfig);

// TODO: scoped to gracefully shutdown the database connection when the server is stopped
export const DatabaseLive = Layer.provideMerge(DrizzleLive, MysqlLive);

export { MysqlDrizzle as DatabaseService };
