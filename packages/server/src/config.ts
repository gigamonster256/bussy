import { ConfigProvider } from "effect";

// Default config values (non-sensitive)
const defaults = ConfigProvider.fromJson({
  // Server
  PORT: "3000",

  // API caching
  API_AUTH_CACHE_TTL: "6 hours",
  API_METADATA_TTL: "1 hour",

  // Polling intervals
  POLLING_URGENT_INTERVAL: "15 seconds",
  POLLING_SOON_INTERVAL: "30 seconds",
  POLLING_FREQUENT_INTERVAL: "2 minutes",
  POLLING_LAZY_INTERVAL: "5 minutes",

  // Web Push
  VAPID_SUBJECT: "mailto:admin@example.com",
});

// Environment variables take precedence over defaults
// Sensitive values (DATABASE_URL, VAPID keys) come from environment only
export const BussyConfig = ConfigProvider.orElse(ConfigProvider.fromEnv(), () => defaults);
