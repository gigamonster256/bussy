import { HttpApi, HttpApiError } from "@effect/platform";
import { HealthGroup } from "./health";
import { DeviceGroup } from "./device";
import { SubscriptionGroup } from "./subscription";

export const BussyApi = HttpApi.make("BussyApi")
  // V1 endpoints
  .add(HealthGroup.prefix("/v1/health"))
  .add(DeviceGroup.prefix("/v1/device"))
  .add(SubscriptionGroup.prefix("/v1/subscription"))
  .addError(HttpApiError.InternalServerError)
  .prefix("/api");
