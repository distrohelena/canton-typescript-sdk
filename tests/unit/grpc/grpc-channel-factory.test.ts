import { describe, expect, it } from "vitest";
import {
    CantonClientOptions,
    GrpcChannelSecurity,
    RequestOptions,
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

    it("uses the per-request timeout override before the client default", async () => {
        const options = await buildGrpcCallOptionsAsync(
            undefined,
            1_000,
            new RequestOptions({
                timeoutMs: 2_500,
            }),
        );

        expect(options.timeout).toBe(2_500);
    });

    it("passes auth metadata into generated unary calls", async () => {
        let capturedOptions: unknown;

        let capturedHealthOptions: unknown;

        const operations = createGrpcOperations(
            new CantonClientOptions({
                transportKind: TransportKind.grpc,
                ledgerEndpoint: "http://localhost:6865",
                grpcChannelSecurity: GrpcChannelSecurity.insecure,
                authProvider: {
                    getHeadersAsync: async () => ({
                        authorization: "Bearer token-123",
                        "x-canton-test": "yes",
                    }),
                },
            }),
            "http://localhost:6865",
            GrpcChannelSecurity.insecure,
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
                healthClient: {
                    check: (_request: unknown, options?: unknown) => {
                        capturedHealthOptions = options;

                        return {
                            response: Promise.resolve({
                                status: 1,
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

        const healthResult = await operations.checkHealthAsync({
            service: "grpc.health.v1.Health",
        }, new RequestOptions({
            timeoutMs: 2_500,
        }));

        expect(result).toMatchObject({ version: "3.4.0" });
        expect(healthResult).toMatchObject({ status: 1 });
        expect(capturedOptions).toMatchObject({
            meta: {
                authorization: "Bearer token-123",
                "x-canton-test": "yes",
            },
        });
        expect(capturedHealthOptions).toMatchObject({
            meta: {
                authorization: "Bearer token-123",
                "x-canton-test": "yes",
            },
            timeout: 2_500,
        });
    });

    it("passes auth metadata and shared request options into package unary calls", async () => {
        let capturedLedgerRequest: unknown;

        let capturedLedgerOptions: unknown;

        let capturedParticipantRequest: unknown;

        let capturedParticipantOptions: unknown;

        const operations = createGrpcOperations(
            new CantonClientOptions({
                transportKind: TransportKind.grpc,
                ledgerEndpoint: "http://localhost:6865",
                adminEndpoint: "http://localhost:8080",
                grpcChannelSecurity: GrpcChannelSecurity.tls,
                adminGrpcChannelSecurity: GrpcChannelSecurity.insecure,
                defaultRequestTimeoutMs: 1_500,
                authProvider: {
                    getHeadersAsync: async () => ({
                        authorization: "Bearer token-123",
                        "x-canton-test": "yes",
                    }),
                },
            }),
            "http://localhost:8080",
            GrpcChannelSecurity.insecure,
            {
                versionServiceClient: {
                    getLedgerApiVersion: () => ({
                        response: Promise.resolve({
                            version: "3.4.0",
                            features: {},
                        }),
                    }),
                },
                healthClient: {
                    check: () => ({
                        response: Promise.resolve({
                            status: 1,
                        }),
                    }),
                },
                partyManagementServiceClient: {
                    allocateParty: () => ({
                        response: Promise.resolve({}),
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
                ledgerPackageServiceClient: {
                    listPackages: (request: unknown, options?: unknown) => {
                        capturedLedgerRequest = request;
                        capturedLedgerOptions = options;

                        return {
                            response: Promise.resolve({
                                packageIds: [],
                            }),
                        };
                    },
                    getPackage: () => ({
                        response: Promise.resolve({
                            hashFunction: 0,
                            archivePayload: new Uint8Array(),
                            hash: "",
                        }),
                    }),
                    getPackageStatus: () => ({
                        response: Promise.resolve({
                            packageStatus: 0,
                        }),
                    }),
                    listVettedPackages: () => ({
                        response: Promise.resolve({
                            vettedPackages: [],
                            nextPageToken: "",
                        }),
                    }),
                },
                participantPackageServiceClient: {
                    listPackages: () => ({
                        response: Promise.resolve({
                            packageDescriptions: [],
                        }),
                    }),
                    getPackageContents: (request: unknown, options?: unknown) => {
                        capturedParticipantRequest = request;
                        capturedParticipantOptions = options;

                        return {
                            response: Promise.resolve({
                                modules: [],
                                isUtilityPackage: false,
                                languageVersion: "",
                            }),
                        };
                    },
                    getPackageReferences: () => ({
                        response: Promise.resolve({
                            dars: [],
                        }),
                    }),
                },
            } as any,
        ) as any;

        await operations.listPackagesAsync({}, new RequestOptions({
            timeoutMs: 2_500,
        }));
        await operations.getParticipantPackageContentsAsync({
            packageId: "pkg-1",
        });

        expect(capturedLedgerRequest).toEqual({});
        expect(capturedLedgerOptions).toMatchObject({
            meta: {
                authorization: "Bearer token-123",
                "x-canton-test": "yes",
            },
            timeout: 2_500,
        });
        expect(capturedParticipantRequest).toEqual({
            packageId: "pkg-1",
        });
        expect(capturedParticipantOptions).toMatchObject({
            meta: {
                authorization: "Bearer token-123",
                "x-canton-test": "yes",
            },
            timeout: 1_500,
        });
    });
});
