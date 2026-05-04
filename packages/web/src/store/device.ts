import { Effect } from "effect";
import { LocalStore } from "@/store";

export const deviceId = LocalStore("bussy:device-id");
export const deviceToken = LocalStore("bussy:device-token");

/** Clear all device-related storage */
export const clearDevice = Effect.all([deviceId.remove, deviceToken.remove], { discard: true });

/** Persist both id and token from a device registration result */
export const saveDevice = (device: { id: string; token: string }) =>
  Effect.all([deviceId.set(device.id), deviceToken.set(device.token)]);
