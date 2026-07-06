import { describe, expect, it, vi } from "vitest";
import {
    CantonClientOptions,
    GrpcChannelSecurity,
    TransportKind,
} from "../../../src";

const grpcTransportConstructor = vi.fn();

vi.mock("@grpc/grpc-js", () => ({
    credentials: {
        createInsecure: vi.fn(() => "insecure-credentials"),
        createSsl: vi.fn(() => "ssl-credentials"),
    },
}));

vi.mock("@protobuf-ts/grpc-transport", () => ({
    GrpcTransport: vi.fn().mockImplementation((options: unknown) => {
        grpcTransportConstructor(options);

        return {};
    }),
}));

describe("gRPC connect timeout", () => {
    it("passes the selected endpoint, security, and grpcConnectTimeoutMs into the protobuf transport", async () => {
        const { createGrpcOperations } = await import(
            "../../../src/transports/grpc/grpc-channel-factory.js"
        );

        grpcTransportConstructor.mockClear();

        createGrpcOperations(
            new CantonClientOptions({
                transportKind: TransportKind.grpc,
                ledgerEndpoint: "https://ledger.example.com",
                ledgerAdminEndpoint: "http://ledger-admin.example.com:8080",
                participantAdminEndpoint:
                    "http://participant-admin.example.com:8081",
                grpcChannelSecurity: GrpcChannelSecurity.tls,
                ledgerAdminGrpcChannelSecurity: GrpcChannelSecurity.insecure,
                participantAdminGrpcChannelSecurity:
                    GrpcChannelSecurity.insecure,
                grpcConnectTimeoutMs: 4_500,
            }),
            "http://participant-admin.example.com:8081",
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
                stateServiceClient: {
                    getActiveContractsPage: () => ({
                        response: Promise.resolve({
                            activeContracts: [],
                        }),
                    }),
                },
                updateServiceClient: {
                    getUpdates: () => ({
                        responses: (async function* () {})(),
                    }),
                },
                commandServiceClient: {
                    submitAndWait: () => ({
                        response: Promise.resolve({}),
                    }),
                },
            },
        );

        expect(grpcTransportConstructor).toHaveBeenCalledWith(
            expect.objectContaining({
                host: "participant-admin.example.com:8081",
                channelCredentials: "insecure-credentials",
                clientOptions: expect.objectContaining({
                    connectTimeoutMs: 4_500,
                }),
            }),
        );
    });
});
