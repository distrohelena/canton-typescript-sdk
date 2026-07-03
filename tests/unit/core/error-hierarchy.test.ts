import { describe, expect, it } from "vitest";
import { CantonError, NotSupportedError } from "../../../src";

describe("error hierarchy", () => {
    it("keeps sdk errors in a single hierarchy", () => {
        const error = new NotSupportedError("json signing is not supported");

        expect(error).toBeInstanceOf(CantonError);
        expect(error.name).toBe("NotSupportedError");
    });
});
