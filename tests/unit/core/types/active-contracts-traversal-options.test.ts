import {
    ActiveContractsTraversalError,
    ActiveContractsTraversalOptions,
    CantonError,
    OperationDeadline,
    ValidationError,
} from "../../../../src";
import { describe, expect, it } from "vitest";

function deadline(): OperationDeadline {
    return new OperationDeadline({ timeoutMs: 100, now: () => 1_000 });
}

describe("ActiveContractsTraversalOptions", () => {
    it("preserves the shared deadline and freezes positive safe bounds", () => {
        const sharedDeadline = deadline();

        const options = new ActiveContractsTraversalOptions({
            deadline: sharedDeadline,
            maxPages: 3,
            maxContracts: 7,
        });

        expect(Object.isFrozen(options)).toBe(true);
        expect(options.deadline).toBe(sharedDeadline);
        expect(options.maxPages).toBe(3);
        expect(options.maxContracts).toBe(7);
        expect(Reflect.set(options, "maxPages", 4)).toBe(false);
        expect(options.maxPages).toBe(3);
    });

    it.each([
        undefined,
        null,
        {},
        { remainingTimeoutMs: () => 1 },
    ])("rejects a non-deadline value of %p", invalidDeadline => {
        expect(() => new ActiveContractsTraversalOptions({
            deadline: invalidDeadline as OperationDeadline,
            maxPages: 1,
            maxContracts: 1,
        })).toThrow(ValidationError);
    });

    it.each([
        0,
        -1,
        1.5,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.MAX_SAFE_INTEGER + 1,
    ])("rejects an invalid maxPages value of %p", maxPages => {
        expect(() => new ActiveContractsTraversalOptions({
            deadline: deadline(),
            maxPages,
            maxContracts: 1,
        })).toThrow(ValidationError);
    });

    it.each([
        0,
        -1,
        1.5,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.MAX_SAFE_INTEGER + 1,
    ])("rejects an invalid maxContracts value of %p", maxContracts => {
        expect(() => new ActiveContractsTraversalOptions({
            deadline: deadline(),
            maxPages: 1,
            maxContracts,
        })).toThrow(ValidationError);
    });
});

describe("ActiveContractsTraversalError", () => {
    it.each([
        "active-at-offset-mismatch",
        "missing-active-at-offset",
        "repeated-page-token",
        "max-pages-exceeded",
        "max-contracts-exceeded",
    ] as const)("retains the %s invariant code", code => {
        const message = `diagnostic context for ${code}`;

        const error = new ActiveContractsTraversalError(code, message);

        expect(error).toBeInstanceOf(CantonError);
        expect(error.code).toBe(code);
        expect(error.message).toBe(message);
    });
});
