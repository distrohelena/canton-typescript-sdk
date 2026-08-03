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

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects a non-positive or non-finite cache TTL", (ttlMs) => {
        const options: CantonManagerOptions = {
            grpc: { transportKind: TransportKind.grpc } as never,
            querySource: QuerySource.grpc,
            cache: { store: {} as never, ttlMs },
        };

        expect(() => new CantonManager(options)).toThrow(ValidationError);
    });
});
