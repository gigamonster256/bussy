import { bigint, char, timestamp as rawTs } from "drizzle-orm/mysql-core";
import { ULID_LENGTH } from "@bussy/schemas";

/**
 * ID column length for Drizzle.
 * Currently 30 = 3 char prefix + 1 underscore + 26 ULID chars.
 * If you add prefixes longer than 3 chars, update this accordingly.
 */
export const ID_LENGTH = 4 + ULID_LENGTH; // prefix(3) + separator(1) + ULID(26)

export const ulid = (name: string) => char(name, { length: ID_LENGTH });

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