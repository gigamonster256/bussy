import { ConfigProvider } from "effect"

export const TestConfigProvider = ConfigProvider.fromJson({
  API_AUTH_CACHE_TTL: "1 second",
  API_METADATA_TTL: "1 second"
})
