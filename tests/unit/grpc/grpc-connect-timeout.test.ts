import { describe, expect, it, vi } from "vitest";
import {
    CantonClientOptions,
    GrpcChannelSecurity,
    TransportKind,
} from "../../../src";

const grpcTransportConstructor = vi.fn();

vi.mock("@protobuf-ts/grpc-transport", () => ({
    GrpcTransport: vi.fn().mockImplementation((options: unknown) => {
        grpcTransportConstructor(options);

        return {};
    }),
}));

describe("gRPC connect timeout", () => {
    it("passes grpcConnectTimeoutMs into the protobuf transport", async () => {
        const { createGrpcOperations } = await import(
            "../../../src/transports/grpc/grpc-channel-factory.js"
        );

        grpcTransportConstructor.mockClear();

        createGrpcOperations(
            new CantonClientOptions({
                transportKind: TransportKind.grpc,
                endpoint: "http://localhost:6865",
                grpcChannelSecurity: GrpcChannelSecurity.insecure,
                grpcConnectTimeoutMs: 4_500,
            }),
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
                clientOptions: expect.objectContaining({
                    connectTimeoutMs: 4_500,
                }),
            }),
        );
    });
});
