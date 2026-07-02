import { describe, expect, it } from "vitest";
import { BearerTokenAuthProvider } from "../../../src";

describe("BearerTokenAuthProvider", () => {
  it("returns a bearer token header", async () => {
    const provider = new BearerTokenAuthProvider("token-123");

    await expect(provider.getHeadersAsync()).resolves.toEqual({
      authorization: "Bearer token-123"
    });
  });
});
