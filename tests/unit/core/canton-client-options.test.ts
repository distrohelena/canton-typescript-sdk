import { describe, expect, it } from "vitest";
import { CantonClientOptions, TransportKind } from "../../../src";

describe("CantonClientOptions", () => {
    it("stores transport and endpoint settings", () => {
        const options = new CantonClientOptions({
            transportKind: TransportKind.grpc,
            endpoint: "https://participant.example.com",
        });

        expect(options.transportKind).toBe(TransportKind.grpc);
        expect(options.endpoint).toBe("https://participant.example.com");
    });
});
