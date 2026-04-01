import { mysqlTable, text } from "drizzle-orm/mysql-core"
import { id, timestamps } from "../drizzle/types";
import { index } from "drizzle-orm/cockroach-core";


export const deviceTable = mysqlTable("device", {
  ...id,
  token: text("token").notNull(),
  pushEndpoint: text("push_endpoint"),
  pushP256dh: text("push_p256dh"),
  pushAuth: text("push_auth"),
  ...timestamps,
}, (table) => [
  index("idx_device_token").on(table.token)
]
)