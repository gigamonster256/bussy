import { Layer } from "effect";
import { DeviceService } from "./device";
import { SubscriptionService } from "./subscription";

export const Resources = Layer.mergeAll(
  DeviceService.Default,
  SubscriptionService.Default
)