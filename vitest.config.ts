import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Live specs seed a real localnet (DAR uploads, party allocation) and unit specs share one machine
    // with vitest's parallel workers; the 5s default produced spurious timeouts in both.
    testTimeout: 120_000,
    hookTimeout: 120_000
  }
});
