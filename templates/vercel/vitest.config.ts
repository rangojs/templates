import { rangoTestConfig } from "@rangojs/router/testing/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.{ts,tsx}"],
    ...rangoTestConfig(),
  },
});
