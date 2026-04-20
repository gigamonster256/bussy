import { describe, it, expect } from "vitest";
import { Schema } from "effect";
import {
  prefixes,
  createID,
  idRegex,
  resourceIDSchema,
  timestampedResource,
  ID_LENGTH,
  ID_PREFIX_LENGTH,
  ULID_LENGTH,
} from "../src/common";
import { DeviceSchema } from "../src/device";
import { SubscriptionSchema, ROUTE_ID_MAX_LENGTH } from "../src/subscription";

// Helper to get ISO date string for tests
const nowISO = () => new Date().toISOString();

describe("ID Configuration", () => {
  it("all prefixes have length 3", () => {
    for (const [resource, prefix] of Object.entries(prefixes)) {
      expect(prefix.length, `prefix for ${resource} should be 3 chars`).toBe(ID_PREFIX_LENGTH);
    }
  });

  it("ID_LENGTH is calculated correctly", () => {
    expect(ID_LENGTH).toBe(ID_PREFIX_LENGTH + 1 + ULID_LENGTH); // prefix + underscore + ULID
  });

  it("ULID_LENGTH is 26", () => {
    expect(ULID_LENGTH).toBe(26);
  });
});

describe("createID", () => {
  it("creates valid device IDs", () => {
    const id = createID("device");
    expect(id).toMatch(idRegex("device"));
    expect(id.length).toBe(ID_LENGTH);
  });

  it("creates valid subscription IDs", () => {
    const id = createID("subscription");
    expect(id).toMatch(idRegex("subscription"));
    expect(id.length).toBe(ID_LENGTH);
  });

  it("creates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => createID("device")));
    expect(ids.size).toBe(100);
  });

  it("separates prefix and ULID with underscore", () => {
    const id = createID("device");
    expect(id.charAt(3)).toBe("_");
  });
});

describe("resourceIDSchema", () => {
  const deviceIDSchema = resourceIDSchema("device");
  const subscriptionIDSchema = resourceIDSchema("subscription");

  it("validates correct device IDs", () => {
    const id = createID("device");
    expect(Schema.decodeSync(deviceIDSchema)(id)).toBe(id);
  });

  it("validates correct subscription IDs", () => {
    const id = createID("subscription");
    expect(Schema.decodeSync(subscriptionIDSchema)(id)).toBe(id);
  });

  it("rejects invalid prefix", () => {
    const result = Schema.decodeEither(deviceIDSchema)("usr_01HXR1YBTMPXJKF5C8QW2NBP8G");
    expect(result._tag).toBe("Left");
  });

  it("rejects malformed ULID with invalid chars", () => {
    // 'I' is not in the ULID base32 charset
    const result = Schema.decodeEither(deviceIDSchema)("dev_01HXR1YBTMPXJKF5C8QW2NBPI");
    expect(result._tag).toBe("Left");
  });

  it("rejects IDs that are too short", () => {
    const result = Schema.decodeEither(deviceIDSchema)("dev_short");
    expect(result._tag).toBe("Left");
  });

  it("rejects IDs that are too long", () => {
    const result = Schema.decodeEither(deviceIDSchema)("dev_01HXR1YBTMPXJKF5C8QW2NBP8Gextra");
    expect(result._tag).toBe("Left");
  });

  it("rejects missing underscore separator", () => {
    const result = Schema.decodeEither(deviceIDSchema)("dev01HXR1YBTMPXJKF5C8QW2NBP8G");
    expect(result._tag).toBe("Left");
  });
});

describe("timestampedResource", () => {
  const testSchema = timestampedResource("device", {
    name: Schema.String,
  });

  it("adds id field with correct prefix validation", () => {
    const valid = Schema.decodeSync(testSchema)({
      id: createID("device"),
      name: "test",
      timeCreated: nowISO(),
      timeUpdated: nowISO(),
    });
    expect(valid.id).toMatch(idRegex("device"));
    expect(valid.name).toBe("test");
  });

  it("adds timeCreated and timeUpdated fields", () => {
    const iso = nowISO();
    const result = Schema.decodeSync(testSchema)({
      id: createID("device"),
      name: "test",
      timeCreated: iso,
      timeUpdated: iso,
    });
    expect(result.timeCreated).toBeInstanceOf(Date);
    expect(result.timeUpdated).toBeInstanceOf(Date);
  });

  it("rejects wrong prefix in id", () => {
    const result = Schema.decodeEither(testSchema)({
      id: createID("subscription"), // wrong prefix
      name: "test",
      timeCreated: nowISO(),
      timeUpdated: nowISO(),
    });
    expect(result._tag).toBe("Left");
  });
});

describe("DeviceSchema", () => {
  it("validates a complete device", () => {
    const device = Schema.decodeSync(DeviceSchema)({
      id: createID("device"),
      token: "some-token",
      pushEndpoint: null,
      pushP256dh: null,
      pushAuth: null,
      timeCreated: nowISO(),
      timeUpdated: nowISO(),
    });
    expect(device.id).toMatch(/^dev_/);
    expect(device.token).toBe("some-token");
  });

  it("validates device with push notification fields", () => {
    const device = Schema.decodeSync(DeviceSchema)({
      id: createID("device"),
      token: "some-token",
      pushEndpoint: "https://example.com/push",
      pushP256dh: "key123",
      pushAuth: "auth123",
      timeCreated: nowISO(),
      timeUpdated: nowISO(),
    });
    expect(device.pushEndpoint).toBe("https://example.com/push");
    expect(device.pushP256dh).toBe("key123");
    expect(device.pushAuth).toBe("auth123");
  });
});

describe("SubscriptionSchema", () => {
  it("validates a complete subscription", () => {
    const subscription = Schema.decodeSync(SubscriptionSchema)({
      id: createID("subscription"),
      deviceID: createID("device"),
      routeID: "route-123",
      directionID: "inbound",
      stopID: "stop-456",
      notifyMinutes: 10,
      timeRangeStart: "08:00",
      timeRangeEnd: "18:00",
      timeCreated: nowISO(),
      timeUpdated: nowISO(),
    });
    expect(subscription.id).toMatch(idRegex("subscription"));
    expect(subscription.deviceID).toMatch(idRegex("device"));
    expect(subscription.notifyMinutes).toBe(10);
  });

  it("enforces routeID max length", () => {
    const longRouteID = "a".repeat(ROUTE_ID_MAX_LENGTH + 1);
    const result = Schema.decodeEither(SubscriptionSchema)({
      id: createID("subscription"),
      deviceID: createID("device"),
      routeID: longRouteID,
      directionID: "inbound",
      stopID: "stop-456",
      notifyMinutes: 10,
      timeRangeStart: "08:00",
      timeRangeEnd: "18:00",
      timeCreated: nowISO(),
      timeUpdated: nowISO(),
    });
    expect(result._tag).toBe("Left");
  });

  it("enforces timeRangeStart format", () => {
    const result = Schema.decodeEither(SubscriptionSchema)({
      id: createID("subscription"),
      deviceID: createID("device"),
      routeID: "route-123",
      directionID: "inbound",
      stopID: "stop-456",
      notifyMinutes: 10,
      timeRangeStart: "8:00", // missing leading zero
      timeRangeEnd: "18:00",
      timeCreated: nowISO(),
      timeUpdated: nowISO(),
    });
    expect(result._tag).toBe("Left");
  });

  it("enforces notifyMinutes range (max)", () => {
    const result = Schema.decodeEither(SubscriptionSchema)({
      id: createID("subscription"),
      deviceID: createID("device"),
      routeID: "route-123",
      directionID: "inbound",
      stopID: "stop-456",
      notifyMinutes: 100, // exceeds max of 60
      timeRangeStart: "08:00",
      timeRangeEnd: "18:00",
      timeCreated: nowISO(),
      timeUpdated: nowISO(),
    });
    expect(result._tag).toBe("Left");
  });

  it("enforces notifyMinutes range (min)", () => {
    const result = Schema.decodeEither(SubscriptionSchema)({
      id: createID("subscription"),
      deviceID: createID("device"),
      routeID: "route-123",
      directionID: "inbound",
      stopID: "stop-456",
      notifyMinutes: -1, // below min of 0
      timeRangeStart: "08:00",
      timeRangeEnd: "18:00",
      timeCreated: nowISO(),
      timeUpdated: nowISO(),
    });
    expect(result._tag).toBe("Left");
  });
});
