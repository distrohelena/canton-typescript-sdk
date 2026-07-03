import { TransportError } from "../../core/errors/transport-error.js";

export interface GrpcOperations {
    getHealthAsync(): Promise<unknown>;
    createPartyAsync(request: unknown): Promise<unknown>;
    grantUserRightsAsync(request: unknown): Promise<unknown>;
    uploadPackageAsync(request: unknown): Promise<unknown>;
    queryContractsAsync(request: unknown): Promise<unknown>;
    streamTransactionsAsync(request: unknown): Promise<unknown>;
    submitCommandAsync(request: unknown): Promise<unknown>;
}

export function createGrpcOperations(_endpoint: string): GrpcOperations {
    return {
        async getHealthAsync(): Promise<unknown> {
            throw new TransportError(
                "gRPC health operations are not wired yet",
            );
        },
        async createPartyAsync(_request: unknown): Promise<unknown> {
            throw new TransportError("gRPC party operations are not wired yet");
        },
        async grantUserRightsAsync(_request: unknown): Promise<unknown> {
            throw new TransportError("gRPC user operations are not wired yet");
        },
        async uploadPackageAsync(_request: unknown): Promise<unknown> {
            throw new TransportError(
                "gRPC package operations are not wired yet",
            );
        },
        async queryContractsAsync(_request: unknown): Promise<unknown> {
            throw new TransportError("gRPC query operations are not wired yet");
        },
        async streamTransactionsAsync(_request: unknown): Promise<unknown> {
            throw new TransportError(
                "gRPC stream operations are not wired yet",
            );
        },
        async submitCommandAsync(_request: unknown): Promise<unknown> {
            throw new TransportError(
                "gRPC command submission is not wired yet",
            );
        },
    };
}
