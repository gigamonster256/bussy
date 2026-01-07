import { ConfigProvider } from "effect"

export const Config = ConfigProvider.fromJson({
  API_AUTH_CACHE_TTL: "6 hours", // "Duration.hours(6),
  API_METADATA_TTL: "1 hour", // "Duration.hours(1),

  POLLING_URGENT_INTERVAL: "15 seconds",
  POLLING_SOON_INTERVAL: "30 seconds",
  POLLING_FREQUENT_INTERVAL: "2 minutes",
  POLLING_LAZY_INTERVAL: "5 minutes",

  SSE_HEARTBEAT_INTERVAL: "30 seconds",

  TRACING_EXPORTER: "otlp" // "console" or "otlp"
})
