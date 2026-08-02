import {
    ActiveContractsTraversalOptions,
    OperationDeadline,
} from "@distrohelena/canton-typescript-sdk";

/** Explicit safety limits for the shared localnet examples. */
export const EXAMPLE_ACTIVE_CONTRACTS_MAX_PAGES = 100;

/** Explicit safety limits for the shared localnet examples. */
export const EXAMPLE_ACTIVE_CONTRACTS_MAX_CONTRACTS = 10_000;

export function createExampleActiveContractsTraversalOptions(
    deadline: OperationDeadline,
): ActiveContractsTraversalOptions {
    return new ActiveContractsTraversalOptions({
        deadline,
        maxPages: EXAMPLE_ACTIVE_CONTRACTS_MAX_PAGES,
        maxContracts: EXAMPLE_ACTIVE_CONTRACTS_MAX_CONTRACTS,
    });
}
