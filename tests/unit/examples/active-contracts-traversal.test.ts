import {
    ActiveContractsTraversalOptions,
    OperationDeadline,
} from "@distrohelena/canton-typescript-sdk";
import { describe, expect, it } from "vitest";
import {
    EXAMPLE_ACTIVE_CONTRACTS_MAX_CONTRACTS,
    EXAMPLE_ACTIVE_CONTRACTS_MAX_PAGES,
    createExampleActiveContractsTraversalOptions,
} from "../../../examples/shared/active-contracts-traversal.js";

describe("example active-contract traversal", () => {
    it("uses explicit localnet safety bounds with the caller's deadline", () => {
        const deadline = new OperationDeadline({ timeoutMs: 1_000 });

        const options = createExampleActiveContractsTraversalOptions(deadline);

        expect(EXAMPLE_ACTIVE_CONTRACTS_MAX_PAGES).toBe(100);
        expect(EXAMPLE_ACTIVE_CONTRACTS_MAX_CONTRACTS).toBe(10_000);
        expect(options).toBeInstanceOf(ActiveContractsTraversalOptions);
        expect(options).toMatchObject({
            deadline,
            maxPages: EXAMPLE_ACTIVE_CONTRACTS_MAX_PAGES,
            maxContracts: EXAMPLE_ACTIVE_CONTRACTS_MAX_CONTRACTS,
        });
    });
});
