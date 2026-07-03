import { describe, expect, it } from "vitest";
import { CantonClient, CantonClientOptions, TransportKind } from "../../../src";

describe("package surface", () => {
    it("exports the root client types", () => {
        expect(CantonClient).toBeTypeOf("function");
        expect(CantonClientOptions).toBeTypeOf("function");
        expect(TransportKind.grpc).toBe("grpc");
    });
});
