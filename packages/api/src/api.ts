import { HttpApi, HttpApiError } from "@effect/platform";
import { HealthGroup } from "./health";
import { DeviceGroup } from "./device";
import { SubscriptionGroup } from "./subscription";
import { MetaGroup } from "./meta";
import { ArrivalGroup } from "./arrival";

export const BussyApi = HttpApi.make("BussyApi")
  // V1 endpoints
  .add(HealthGroup.prefix("/v1/health"))
  .add(DeviceGroup.prefix("/v1/device"))
  .add(SubscriptionGroup.prefix("/v1/subscription"))
  .add(MetaGroup.prefix("/v1/meta"))
  .add(ArrivalGroup.prefix("/v1/arrival"))
  .addError(HttpApiError.InternalServerError)
  .prefix("/api");
