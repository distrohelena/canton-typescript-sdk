import { describe, expect, it } from "vitest";
import {
    CantonClientOptions,
    GrpcChannelSecurity,
    TransportKind,
} from "../../../src";

describe("CantonClientOptions", () => {
    it("stores transport and endpoint settings", () => {
        const options = new CantonClientOptions({
            transportKind: TransportKind.grpc,
            endpoint: "https://participant.example.com",
        });

        expect(options.transportKind).toBe(TransportKind.grpc);
        expect(options.endpoint).toBe("https://participant.example.com");
    });

    it("defaults grpc channel security to tls", () => {
        const options = new CantonClientOptions({
            transportKind: TransportKind.grpc,
            endpoint: "https://participant.example.com",
        });

        expect(options.grpcChannelSecurity).toBe(GrpcChannelSecurity.tls);
    });

    it("stores an explicit grpc channel security override", () => {
        const options = new CantonClientOptions({
            transportKind: TransportKind.grpc,
            endpoint: "http://localhost:6865",
            grpcChannelSecurity: GrpcChannelSecurity.insecure,
        });

        expect(options.grpcChannelSecurity).toBe(
            GrpcChannelSecurity.insecure,
        );
    });
});
