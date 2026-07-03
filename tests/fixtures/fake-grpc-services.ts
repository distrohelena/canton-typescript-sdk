import { GrpcOperations } from "../../src/transports/grpc/grpc-channel-factory.js";

export function createFakeGrpcOperations(
    overrides: Partial<GrpcOperations> = {},
): GrpcOperations {
    return {
        getHealthAsync: async () => ({ status: "healthy" }),
        createPartyAsync: async () => ({ identifier: "unused" }),
        listPartiesAsync: async () => ({
            partyDetails: [],
            nextPageToken: "",
        }),
        grantUserRightsAsync: async () => ({ rights: [] }),
        uploadPackageAsync: async () => ({ packageId: "unused" }),
        queryContractsAsync: async () => ({ activeContracts: [] }),
        streamTransactionsAsync: async () => [],
        submitCommandAsync: async () => ({
            updateId: "tx-1",
            completionOffset: "10",
        }),
        ...overrides,
    };
}
