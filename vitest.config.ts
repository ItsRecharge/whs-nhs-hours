import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    setupFiles: ["tests/helpers/setup-db.ts"],
    env: {
      DATABASE_URL: "file:./tests/.tmp/test.db",
      SESSION_SECRET: "test-secret-at-least-16-chars",
      APP_URL: "http://localhost:3000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
