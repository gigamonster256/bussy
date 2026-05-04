import { Layer } from "effect";
import { DeviceService } from "./device";
import { SubscriptionService } from "./subscription";
import { DepartureNotifier } from "./notifier";
import { DatabaseLive } from "./drizzle";

const Resources = Layer.mergeAll(DeviceService.Default, SubscriptionService.Default);

const ResourcesWithNotifier = Layer.provideMerge(DepartureNotifier.Default, Resources);

export const ResourcesLive = Layer.provide(ResourcesWithNotifier, DatabaseLive);
