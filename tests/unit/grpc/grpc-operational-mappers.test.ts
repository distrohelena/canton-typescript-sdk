import { describe, expect, it } from "vitest";
import { mapGrpcCreateParty } from "../../../src/transports/grpc/mappers/parties-mapper.js";
import { mapGrpcHealth } from "../../../src/transports/grpc/mappers/system-mapper.js";

describe("gRPC operational mappers", () => {
    it("maps health payloads", () => {
        const result = mapGrpcHealth({ status: "healthy", version: "1.0.0" });

        expect(result.status).toBe("healthy");
        expect(result.version).toBe("1.0.0");
    });

    it("maps party creation payloads", () => {
        const result = mapGrpcCreateParty({ identifier: "Alice" });

        expect(result.party).toBe("Alice");
    });
});
