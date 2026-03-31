import { Config, Layer } from "effect"
import { MysqlDrizzle, layerWithConfig } from "@effect/sql-drizzle/Mysql"
import { layerConfig as mysqlLayerConfig } from "@effect/sql-mysql2/MysqlClient"
import { DrizzleConfig } from "drizzle-orm"


export const MysqlLive = mysqlLayerConfig({
    host: Config.string("MYSQL_HOST"),
    port: Config.number("MYSQL_PORT"),
    database: Config.string("MYSQL_DATABASE"),
    username: Config.string("MYSQL_USERNAME"),
    password: Config.redacted("MYSQL_PASSWORD"),
})

const drizzleConfig: DrizzleConfig = {
    // logger: true,
}

export const DrizzleLive = layerWithConfig(drizzleConfig)

// TODO: scoped to gracefully shutdown the database connection when the server is stopped
export const DatabaseLive = Layer.provideMerge(DrizzleLive, MysqlLive)

export { MysqlDrizzle as DatabaseService }
