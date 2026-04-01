import { Config, Layer } from "effect"
import { MysqlDrizzle, layerWithConfig } from "@effect/sql-drizzle/Mysql"
import { layerConfig as mysqlLayerConfig } from "@effect/sql-mysql2/MysqlClient"
import { DrizzleConfig } from "drizzle-orm"


export const MysqlLive = mysqlLayerConfig({
    url: Config.redacted("DATABASE_URL")
})

const drizzleConfig: DrizzleConfig = {
    // logger: true,
}

export const DrizzleLive = layerWithConfig(drizzleConfig)

// TODO: scoped to gracefully shutdown the database connection when the server is stopped
export const DatabaseLive = Layer.provideMerge(DrizzleLive, MysqlLive)

export { MysqlDrizzle as DatabaseService }
