import { describe, expect, it } from "vitest";
import {
    CantonError,
    NotSupportedError,
    ObjectDisposedError,
} from "../../../src";

describe("error hierarchy", () => {
    it("keeps sdk errors in a single hierarchy", () => {
        const error = new NotSupportedError("json signing is not supported");

        expect(error).toBeInstanceOf(CantonError);
        expect(error.name).toBe("NotSupportedError");
    });

    it("exports a dedicated disposal lifecycle error", () => {
        const error = new ObjectDisposedError(
            "The client or transport has been disposed.",
        );

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(CantonError);
        expect(error.name).toBe("ObjectDisposedError");
    });
});
