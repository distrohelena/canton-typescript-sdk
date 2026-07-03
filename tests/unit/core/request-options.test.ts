import { describe, expect, it } from "vitest";
import { RequestOptions } from "../../../src";

describe("RequestOptions", () => {
    it("stores a shared per-call timeout override", () => {
        const options = new RequestOptions({
            timeoutMs: 1_500,
        });

        expect(options.timeoutMs).toBe(1_500);
    });
});
