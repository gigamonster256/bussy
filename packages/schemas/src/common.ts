import { Schema } from "effect";
import { ulid } from "ulid";

export const ULID_LENGTH = 26;
export const SEPARATOR = "_";

export const ID_PREFIX_LENGTH = 3;
export const prefixes = {
  device: "dev",
  subscription: "sub",
} as const;

export type ResourcePrefix = keyof typeof prefixes;

export const ID_LENGTH = ID_PREFIX_LENGTH + SEPARATOR.length + ULID_LENGTH;

export function idRegex(prefix: ResourcePrefix) {
  return new RegExp(`^${prefixes[prefix]}${SEPARATOR}[0-9A-HJKMNP-TV-Z]{${ULID_LENGTH}}$`);
}

export function createID(prefix: ResourcePrefix): string {
  return [prefixes[prefix], ulid()].join(SEPARATOR);
}

export function resourceIDSchema(resource: ResourcePrefix) {
  return Schema.String.pipe(Schema.pattern(idRegex(resource)));
}

export function timestampedResource<Fields extends Record<string, Schema.Schema.All>>(
  resource: ResourcePrefix,
  additionalFields: Fields,
) {
  return Schema.Struct({
    id: resourceIDSchema(resource),
    ...additionalFields,
    timeCreated: Schema.Date,
    timeUpdated: Schema.Date,
  });
}
