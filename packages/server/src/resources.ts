import { Layer } from "effect";
import { DeviceService } from "./device";

export const Resources = Layer.mergeAll(
  DeviceService.Default
)