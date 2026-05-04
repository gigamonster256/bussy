import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  define: {
    APP_VERSION: JSON.stringify(process.env.APP_VERSION || "unknown"),
  },
  resolve: {
    alias: [{ find: "@", replacement: "/src" }],
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        sw: path.resolve(__dirname, "src/sw.ts"),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "sw") return "sw.js";
          return "assets/[name]-[hash].js";
        },
      },
    },
  },
});
