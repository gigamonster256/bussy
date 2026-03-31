import { mysqlTable, text } from "drizzle-orm/mysql-core"
import { id, timestamps } from "../drizzle/types";


export const deviceTable = mysqlTable("device", {
  ...id,
  pushEndpoint: text("push_endpoint"),
  pushP256dh: text("push_p256dh"),
  pushAuth: text("push_auth"),
  ...timestamps,
})