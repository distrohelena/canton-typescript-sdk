import { GrpcOperations } from "../../src/transports/grpc/grpcChannelFactory.js";

export function createFakeGrpcOperations(
  overrides: Partial<GrpcOperations> = {}
): GrpcOperations {
  return {
    getHealthAsync: async () => ({ status: "healthy" }),
    createPartyAsync: async () => ({ identifier: "unused" }),
    grantUserRightsAsync: async () => ({ rights: [] }),
    uploadPackageAsync: async () => ({ packageId: "unused" }),
    queryContractsAsync: async () => ({ contracts: [] }),
    streamTransactionsAsync: async () => [],
    submitCommandAsync: async () => ({
      commandId: "cmd-1",
      transactionId: "tx-1"
    }),
    ...overrides
  };
}
