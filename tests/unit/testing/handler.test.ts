import { describe, expect, test } from "vitest";
import {
    bound,
    evaluateHandlerAssumptionAsync,
    handler,
} from "../../../src/testing/handlers/handler.js";

describe("invariant campaign handlers", () => {
    test("turns a failed assumption into a discarded action without execution", async () => {
        const deposit = handler("deposit", {
            assume: () => false,
            cleanup: "none",
        });

        await expect(
            evaluateHandlerAssumptionAsync(deposit, {}, { amount: 1n }),
        ).resolves.toEqual({
            kind: "discarded",
            reason: "handler assumption returned false",
        });
    });

    test("bounds numbers and bigints inclusively", () => {
        expect(bound(-1, 0, 10)).toBe(0);
        expect(bound(11, 0, 10)).toBe(10);
        expect(bound(5, 0, 10)).toBe(5);
        expect(bound(-1n, 0n, 10n)).toBe(0n);
        expect(bound(11n, 0n, 10n)).toBe(10n);
    });
});
