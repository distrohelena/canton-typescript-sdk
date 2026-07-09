import { GrpcOperations } from "../../src/transports/grpc/grpc-channel-factory.js";

export function createFakeGrpcOperations(
    overrides: Partial<GrpcOperations> = {},
): GrpcOperations {
    return {
        checkHealthAsync: async () => ({ status: 1 }),
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
        prepareSubmissionAsync: async () => ({
            preparedTransaction: {},
            preparedTransactionHash: new Uint8Array([9, 9, 9]),
            hashingSchemeVersion: 3,
        }),
        executeSubmissionAndWaitAsync: async () => ({
            updateId: "tx-1",
            completionOffset: "10",
        }),
        submitCommandAsync: async () => ({
            updateId: "tx-1",
            completionOffset: "10",
        }),
        ...overrides,
    };
}
