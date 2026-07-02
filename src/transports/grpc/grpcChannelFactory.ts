import { TransportError } from "../../core/errors/transportError.js";

export interface GrpcOperations {
  getHealthAsync(): Promise<unknown>;
  createPartyAsync(request: unknown): Promise<unknown>;
  grantUserRightsAsync(request: unknown): Promise<unknown>;
  uploadPackageAsync(request: unknown): Promise<unknown>;
}

export function createGrpcOperations(_endpoint: string): GrpcOperations {
  return {
    async getHealthAsync(): Promise<unknown> {
      throw new TransportError("gRPC health operations are not wired yet");
    },
    async createPartyAsync(_request: unknown): Promise<unknown> {
      throw new TransportError("gRPC party operations are not wired yet");
    },
    async grantUserRightsAsync(_request: unknown): Promise<unknown> {
      throw new TransportError("gRPC user operations are not wired yet");
    },
    async uploadPackageAsync(_request: unknown): Promise<unknown> {
      throw new TransportError("gRPC package operations are not wired yet");
    }
  };
}
