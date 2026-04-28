import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  define: {
    APP_VERSION: JSON.stringify(process.env.APP_VERSION || "unknown"),
  },
  resolve: {
    alias: [{ find: "@", replacement: "/src" }],
  },
});
