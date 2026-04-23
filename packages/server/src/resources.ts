import { Layer } from "effect";
import { DeviceService } from "./device";
import { SubscriptionService } from "./subscription";
import { DatabaseLive } from "./drizzle";

const Resources = Layer.mergeAll(DeviceService.Default, SubscriptionService.Default);

export const ResourcesLive = Layer.provide(Resources, DatabaseLive);
