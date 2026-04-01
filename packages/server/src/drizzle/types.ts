import { bigint, char, timestamp as rawTs } from "drizzle-orm/mysql-core";

export const ulid = (name: string) => char(name, { length: 26 + 4 });

export const id = {
  get id() {
    return ulid("id").primaryKey();
  },
};

export const timestamp = (name: string) =>
  rawTs(name, {
    fsp: 3,
    mode: "date",
  });

export const dollar = (name: string) =>
  bigint(name, {
    mode: "number",
  });

export const timestamps = {
  timeCreated: timestamp("time_created").notNull().defaultNow(),
  timeUpdated: timestamp("time_updated")
    .notNull()
    .defaultNow()
    .onUpdateNow(),
//   timeDeleted: timestamp("time_deleted"),
};