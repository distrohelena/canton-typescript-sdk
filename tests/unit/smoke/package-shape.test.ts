import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    PartyManagementServiceClient,
    TransportKind,
    VersionServiceClient,
} from "../../../src";

describe("package surface", () => {
    it("exports the grpc-shaped root client types", () => {
        expect(CantonClient).toBeTypeOf("function");
        expect(CantonClientOptions).toBeTypeOf("function");
        expect(VersionServiceClient).toBeTypeOf("function");
        expect(PartyManagementServiceClient).toBeTypeOf("function");
        expect(TransportKind.grpc).toBe("grpc");
    });
});
