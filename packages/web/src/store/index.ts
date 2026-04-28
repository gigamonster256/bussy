import { Data, Effect, Option } from "effect";

export class NoStoredValue extends Data.TaggedError("NoStoredValue")<{
  readonly key: string;
}> {}

export interface LocalStore {
  readonly get: Effect.Effect<string, NoStoredValue>;
  readonly getOption: Effect.Effect<Option.Option<string>>;
  readonly set: (value: string) => Effect.Effect<void>;
  readonly remove: Effect.Effect<void>;
}

export const LocalStore = (key: string): LocalStore => ({
  get: Effect.sync(() => localStorage.getItem(key)).pipe(
    Effect.flatMap(Effect.fromNullable),
    Effect.mapError(() => new NoStoredValue({ key })),
  ),
  getOption: Effect.sync(() => Option.fromNullable(localStorage.getItem(key))),
  set: (value) => Effect.sync(() => localStorage.setItem(key, value)),
  remove: Effect.sync(() => localStorage.removeItem(key)),
});
