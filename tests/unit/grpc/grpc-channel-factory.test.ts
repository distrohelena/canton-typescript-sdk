import { describe, expect, it } from "vitest";
import {
    CantonClientOptions,
    GrpcChannelSecurity,
    TransportKind,
} from "../../../src";
import { createGrpcOperations } from "../../../src/transports/grpc/grpc-channel-factory.js";
import {
    buildGrpcCallOptionsAsync,
    createGrpcChannelCredentials,
} from "../../../src/transports/grpc/grpc-call-options-factory.js";

describe("gRPC call-options factory", () => {
    it("creates insecure channel credentials", () => {
        const credentials = createGrpcChannelCredentials(
            GrpcChannelSecurity.insecure,
        );

        expect(credentials).toBeDefined();
    });

    it("forwards all auth headers into metadata", async () => {
        const options = await buildGrpcCallOptionsAsync({
            getHeadersAsync: async () => ({
                authorization: "Bearer token-123",
                "x-canton-test": "yes",
            }),
        });

        const metadata = options.meta as Record<string, string>;

        expect(metadata.authorization).toBe("Bearer token-123");
        expect(metadata["x-canton-test"]).toBe("yes");
    });

    it("passes auth metadata into generated unary calls", async () => {
        let capturedOptions: unknown;

        const operations = createGrpcOperations(
            new CantonClientOptions({
                transportKind: TransportKind.grpc,
                endpoint: "http://localhost:6865",
                grpcChannelSecurity: GrpcChannelSecurity.insecure,
                authProvider: {
                    getHeadersAsync: async () => ({
                        authorization: "Bearer token-123",
                        "x-canton-test": "yes",
                    }),
                },
            }),
            {
                versionServiceClient: {
                    getLedgerApiVersion: (_request: unknown, options?: unknown) => {
                        capturedOptions = options;

                        return {
                            response: Promise.resolve({
                                version: "3.4.0",
                                features: {},
                            }),
                        };
                    },
                },
                partyManagementServiceClient: {
                    allocateParty: () => ({
                        response: Promise.resolve({ partyDetails: { party: "Alice" } }),
                    }),
                    listKnownParties: () => ({
                        response: Promise.resolve({
                            partyDetails: [],
                            nextPageToken: "",
                        }),
                    }),
                },
                userManagementServiceClient: {
                    grantUserRights: () => ({
                        response: Promise.resolve({
                            newlyGrantedRights: [],
                        }),
                    }),
                },
                packageManagementServiceClient: {
                    uploadDarFile: () => ({
                        response: Promise.resolve({}),
                    }),
                },
            },
        );

        const result = await operations.getHealthAsync();

        expect(result).toMatchObject({ version: "3.4.0" });
        expect(capturedOptions).toMatchObject({
            meta: {
                authorization: "Bearer token-123",
                "x-canton-test": "yes",
            },
        });
    });
});
