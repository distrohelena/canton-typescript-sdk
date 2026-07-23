import { describe, expect, it } from "vitest";
import { GrpcTransportError } from "../../../src";
import { TransportError } from "../../../src/core/errors/transport-error.js";
import { Status } from "../../../src/transports/grpc/generated/canton/google/rpc/status.js";

type RpcErrorFixture = Error & {
    code?: string;
    serviceName?: string;
    methodName?: string;
    meta?: Record<string, unknown>;
};

function createRpcError(
    overrides: Partial<RpcErrorFixture> = {},
): RpcErrorFixture {
    return Object.assign(new Error("the supplied token is invalid"), {
        name: "RpcError",
        code: "UNAUTHENTICATED",
        serviceName:
            "com.daml.ledger.api.v2.admin.UserManagementService",
        methodName: "ListUsers",
        meta: {
            "x-canton-correlation-id": "request-123",
        },
        ...overrides,
    });
}

function encodedStatus(): Uint8Array {
    return Status.toBinary({
        code: 16,
        message: "the supplied token is invalid",
        details: [{
            typeUrl: "type.googleapis.com/canton.error.v30.RequestInfo",
            value: Uint8Array.from([1, 2, 3]),
        }],
    });
}

describe("GrpcTransportError", () => {
    it("normalizes an RpcError with decoded status details", () => {
        const bytes = encodedStatus();
        const rawError = createRpcError({
            meta: {
                "x-canton-correlation-id": "request-123",
                "grpc-status-details-bin": Buffer.from(bytes).toString("base64"),
            },
        });

        const parsed = GrpcTransportError.fromUnknown(rawError);

        expect(parsed).toBeInstanceOf(GrpcTransportError);
        expect(parsed).toBeInstanceOf(TransportError);
        expect(parsed).toMatchObject({
            grpcCode: "UNAUTHENTICATED",
            serviceName:
                "com.daml.ledger.api.v2.admin.UserManagementService",
            methodName: "ListUsers",
            metadata: {
                "x-canton-correlation-id": ["request-123"],
            },
        });
        expect(parsed?.cause).toBe(rawError);
        expect(parsed?.status).toMatchObject({
            code: 16,
            message: "the supplied token is invalid",
        });
        expect(parsed?.status?.details).toHaveLength(1);
        expect(parsed?.status?.details[0].typeUrl).toBe(
            "type.googleapis.com/canton.error.v30.RequestInfo",
        );
        expect(Array.from(parsed?.status?.details[0].value ?? [])).toEqual([
            1,
            2,
            3,
        ]);
    });

    it.each([
        ["a Uint8Array", (bytes: Uint8Array) => bytes],
        ["a Buffer", (bytes: Uint8Array) => Buffer.from(bytes)],
        ["a mixed array", (bytes: Uint8Array) => ["not-a-status", bytes]],
    ])("decodes status details from %s metadata", (_name, metadataValue) => {
        const rawError = createRpcError({
            meta: {
                "grpc-status-details-bin": metadataValue(encodedStatus()),
            },
        });

        expect(GrpcTransportError.fromUnknown(rawError)?.status).toMatchObject({
            code: 16,
            message: "the supplied token is invalid",
        });
    });

    it("freezes copied metadata without changing the source error", () => {
        const rawError = createRpcError({
            meta: {
                "x-canton-correlation-id": ["request-123"],
            },
        });
        const parsed = GrpcTransportError.fromUnknown(rawError)!;

        expect(Reflect.set(parsed.metadata, "new-value", ["nope"])).toBe(false);
        expect(
            Reflect.set(
                parsed.metadata["x-canton-correlation-id"],
                0,
                "changed",
            ),
        ).toBe(false);
        expect(parsed.metadata["x-canton-correlation-id"]).toEqual([
            "request-123",
        ]);
        expect(rawError.meta?.["x-canton-correlation-id"]).toEqual([
            "request-123",
        ]);
    });

    it("leaves status undefined for malformed status details", () => {
        const rawError = createRpcError({
            meta: { "grpc-status-details-bin": "not-valid-protobuf" },
        });

        expect(GrpcTransportError.fromUnknown(rawError)).toMatchObject({
            grpcCode: "UNAUTHENTICATED",
            status: undefined,
        });
    });

    it("does not normalize non-RpcError values", () => {
        expect(GrpcTransportError.fromUnknown(new Error("ordinary failure"))).toBeUndefined();
        expect(GrpcTransportError.fromUnknown({ code: "UNAUTHENTICATED" })).toBeUndefined();
        expect(GrpcTransportError.fromUnknown(createRpcError({ code: undefined }))).toBeUndefined();
    });
});
