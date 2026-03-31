// import { drizzle } from "drizzle-orm/planetscale-serverless";
// import { Resource } from "sst";
// import { Client } from "@planetscale/database";
// import { Log } from "../util/log";
// export * from "drizzle-orm";

// const client = new Client({
//   host: Resource.Database.host,
//   username: Resource.Database.username,
//   password: Resource.Database.password,
// });

// const log = Log.create({ namespace: "drizzle" });

// export const db = drizzle(client, {
//   logger:
//     process.env.DRIZZLE_LOG === "true"
//       ? {
//           logQuery(query, params) {
//             log.info("query", { query });
//             log.info("params", { params });
//           },
//         }
//       : undefined,
// });