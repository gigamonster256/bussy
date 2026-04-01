import { Effect } from "effect"
import { HttpApiBuilder } from "@effect/platform"
import { BussyApi } from "./api"

export const HealthLive = HttpApiBuilder.group(BussyApi, "health", (handlers) =>
  handlers.handle("health", () => Effect.void)
)