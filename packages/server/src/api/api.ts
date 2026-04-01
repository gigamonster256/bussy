import { HttpApi, HttpApiError } from "@effect/platform"
import { HealthGroup } from "./health/api"
import { DeviceGroup } from "./device/api"
import { SubscriptionGroup } from "./subscription/api"

export const BussyApi = HttpApi.make("BussyApi")
  .add(HealthGroup.prefix("/health"))
  .add(DeviceGroup.prefix("/device"))
  .add(SubscriptionGroup.prefix("/subscription"))
  .addError(HttpApiError.InternalServerError)
