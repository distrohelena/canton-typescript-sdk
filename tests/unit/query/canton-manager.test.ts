import { describe, expect, it } from "vitest";
import {
    CantonManager,
    CantonManagerOptions,
    QuerySource,
    TransportKind,
    ValidationError,
} from "../../../src";

describe("CantonManager", () => {
    it("rejects non-gRPC write configuration", () => {
        const options: CantonManagerOptions = {
            grpc: { transportKind: TransportKind.json } as never,
            querySource: QuerySource.grpc,
        };

        expect(() => new CantonManager(options)).toThrow(ValidationError);
    });
});
