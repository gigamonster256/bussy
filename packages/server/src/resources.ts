import { Layer } from "effect";
import { DeviceService } from "./device";
import { SubscriptionService } from "./subscription";
import { ArrivalNotifier } from "./notifier";
import { DatabaseLive } from "./drizzle";

const Resources = Layer.mergeAll(DeviceService.Default, SubscriptionService.Default);

const ResourcesWithNotifier = Layer.provideMerge(ArrivalNotifier.Default, Resources);

export const ResourcesLive = Layer.provide(ResourcesWithNotifier, DatabaseLive);
