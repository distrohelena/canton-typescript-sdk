import { describe, expect, it } from "vitest";
import {
    CantonClientOptions,
    GrpcChannelSecurity,
    TransportKind,
} from "../../../src";

describe("CantonClientOptions", () => {
    it("stores transport and split endpoint settings", () => {
        const options = new CantonClientOptions({
            transportKind: TransportKind.grpc,
            ledgerEndpoint: "https://ledger.example.com",
            adminEndpoint: "https://admin.example.com",
        });

        expect(options.transportKind).toBe(TransportKind.grpc);
        expect(options.ledgerEndpoint).toBe("https://ledger.example.com");
        expect(options.adminEndpoint).toBe("https://admin.example.com");
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

    it("stores explicit per-surface grpc channel security overrides", () => {
        const options = new CantonClientOptions({
            transportKind: TransportKind.grpc,
            ledgerEndpoint: "https://ledger.example.com",
            adminEndpoint: "http://localhost:8080",
            ledgerGrpcChannelSecurity: GrpcChannelSecurity.tls,
            adminGrpcChannelSecurity: GrpcChannelSecurity.insecure,
        });

        expect(options.ledgerGrpcChannelSecurity).toBe(
            GrpcChannelSecurity.tls,
        );
        expect(options.adminGrpcChannelSecurity).toBe(
            GrpcChannelSecurity.insecure,
        );
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
});
