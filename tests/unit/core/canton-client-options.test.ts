import { describe, expect, it, vi } from "vitest";
import {
    CantonClientOptions,
    GrpcChannelSecurity,
    TransportKind,
} from "../../../src";

describe("CantonClientOptions", () => {
    it("stores transport and strict three-surface endpoint settings", () => {
        const options = new CantonClientOptions({
            transportKind: TransportKind.grpc,
            ledgerEndpoint: "https://ledger.example.com",
            ledgerAdminEndpoint: "https://ledger-admin.example.com",
            participantAdminEndpoint: "https://participant-admin.example.com",
        });

        expect(options.transportKind).toBe(TransportKind.grpc);
        expect(options.ledgerEndpoint).toBe("https://ledger.example.com");
        expect(options.ledgerAdminEndpoint).toBe(
            "https://ledger-admin.example.com",
        );
        expect(options.participantAdminEndpoint).toBe(
            "https://participant-admin.example.com",
        );
        expect("adminEndpoint" in options).toBe(false);
    });

    it("defaults grpc channel security to tls", () => {
        const options = new CantonClientOptions({
            transportKind: TransportKind.grpc,
            ledgerEndpoint: "https://ledger.example.com",
        });

        expect(options.grpcChannelSecurity).toBe(GrpcChannelSecurity.tls);
    });

    it("stores an explicit grpc channel security override", () => {
        const options = new CantonClientOptions({
            transportKind: TransportKind.grpc,
            ledgerEndpoint: "http://localhost:6865",
            grpcChannelSecurity: GrpcChannelSecurity.insecure,
        });

        expect(options.grpcChannelSecurity).toBe(
            GrpcChannelSecurity.insecure,
        );
    });

    it("stores explicit three-surface grpc channel security overrides", () => {
        const options = new CantonClientOptions({
            transportKind: TransportKind.grpc,
            ledgerEndpoint: "https://ledger.example.com",
            ledgerAdminEndpoint: "http://ledger-admin.example.com:8080",
            participantAdminEndpoint:
                "http://participant-admin.example.com:8081",
            ledgerGrpcChannelSecurity: GrpcChannelSecurity.tls,
            ledgerAdminGrpcChannelSecurity: GrpcChannelSecurity.insecure,
            participantAdminGrpcChannelSecurity: GrpcChannelSecurity.insecure,
        });

        expect(options.ledgerGrpcChannelSecurity).toBe(
            GrpcChannelSecurity.tls,
        );
        expect(options.ledgerAdminGrpcChannelSecurity).toBe(
            GrpcChannelSecurity.insecure,
        );
        expect(options.participantAdminGrpcChannelSecurity).toBe(
            GrpcChannelSecurity.insecure,
        );
    });

    it("stores explicit three-surface auth providers", async () => {
        const options = new CantonClientOptions({
            transportKind: TransportKind.grpc,
            ledgerAuthProvider: {
                getHeadersAsync: async () => ({
                    authorization: "Bearer ledger-token",
                }),
            },
            ledgerAdminAuthProvider: {
                getHeadersAsync: async () => ({
                    authorization: "Bearer ledger-admin-token",
                }),
            },
            participantAdminAuthProvider: {
                getHeadersAsync: async () => ({
                    authorization: "Bearer participant-admin-token",
                }),
            },
        });

        await expect(
            options.ledgerAuthProvider?.getHeadersAsync(),
        ).resolves.toEqual({
            authorization: "Bearer ledger-token",
        });
        await expect(
            options.ledgerAdminAuthProvider?.getHeadersAsync(),
        ).resolves.toEqual({
            authorization: "Bearer ledger-admin-token",
        });
        await expect(
            options.participantAdminAuthProvider?.getHeadersAsync(),
        ).resolves.toEqual({
            authorization: "Bearer participant-admin-token",
        });
        expect("authProvider" in options).toBe(false);
    });

    it("stores default request timeout and grpc connect timeout settings", () => {
        const options = new CantonClientOptions({
            transportKind: TransportKind.grpc,
            ledgerEndpoint: "http://localhost:6865",
            defaultRequestTimeoutMs: 5_000,
            grpcConnectTimeoutMs: 2_000,
        });

        expect(options.defaultRequestTimeoutMs).toBe(5_000);
        expect(options.grpcConnectTimeoutMs).toBe(2_000);
    });

    it("stores an optional gRPC error observer", () => {
        const onGrpcError = vi.fn();
        const options = new CantonClientOptions({
            transportKind: TransportKind.grpc,
            onGrpcError,
        });

        expect(options.onGrpcError).toBe(onGrpcError);
    });
});
