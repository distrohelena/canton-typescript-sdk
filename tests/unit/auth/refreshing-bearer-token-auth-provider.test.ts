import { describe, expect, it, vi } from "vitest";
import { RefreshingBearerTokenAuthProvider } from "../../../src/core/auth/refreshing-bearer-token-auth-provider.js";
import { ValidationError } from "../../../src/core/errors/validation-error.js";

describe("RefreshingBearerTokenAuthProvider", () => {
    it("invokes the supplier on every request so rotated tokens take effect immediately", async () => {
        const supplier = vi.fn()
            .mockResolvedValueOnce("token-1")
            .mockResolvedValueOnce("token-2");

        const provider = new RefreshingBearerTokenAuthProvider(supplier);

        await expect(provider.getHeadersAsync()).resolves.toEqual({ authorization: "Bearer token-1" });
        await expect(provider.getHeadersAsync()).resolves.toEqual({ authorization: "Bearer token-2" });
        expect(supplier).toHaveBeenCalledTimes(2);
    });

    it("accepts a synchronous supplier", async () => {
        const provider = new RefreshingBearerTokenAuthProvider(() => "sync-token");

        await expect(provider.getHeadersAsync()).resolves.toEqual({ authorization: "Bearer sync-token" });
    });

    it("fails the request instead of sending an empty bearer token", async () => {
        await expect(new RefreshingBearerTokenAuthProvider(() => "").getHeadersAsync()).rejects.toBeInstanceOf(ValidationError);
        await expect(new RefreshingBearerTokenAuthProvider(() => "   ").getHeadersAsync()).rejects.toBeInstanceOf(ValidationError);
        await expect(new RefreshingBearerTokenAuthProvider(() => undefined as never).getHeadersAsync()).rejects.toBeInstanceOf(ValidationError);
    });

    it("rejects a non-function supplier at construction", () => {
        expect(() => new RefreshingBearerTokenAuthProvider("token" as never)).toThrow(ValidationError);
    });
});
