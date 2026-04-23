import { Config, ConfigProvider, Layer } from "effect";
import { layerWithConfig } from "@effect/sql-drizzle/Mysql";
import { layerConfig as mysqlLayerConfig } from "@effect/sql-mysql2/MysqlClient";

const testDbUrl = process.env.TEST_DATABASE_URL ?? "mysql://bussy:bussy@localhost:3306/bussy_test";

const testMysqlConfig = {
  url: Config.redacted("test_db_url"),
};

const TestMysqlLive = mysqlLayerConfig(testMysqlConfig);

const testDrizzleConfig = {};

const TestDrizzleLive = layerWithConfig(testDrizzleConfig);

export const TestDatabaseLive = Layer.provideMerge(TestDrizzleLive, TestMysqlLive).pipe(
  Layer.provide(
    Layer.setConfigProvider(ConfigProvider.fromMap(new Map([["test_db_url", testDbUrl]]))),
  ),
);
