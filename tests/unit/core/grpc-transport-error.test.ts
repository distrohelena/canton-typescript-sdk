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

    it("preserves __proto__ as an ordinary metadata key", () => {
        const metadata = Object.create(null) as Record<string, unknown>;

        Object.defineProperty(metadata, "__proto__", {
            value: "metadata-value",
            enumerable: true,
        });

        const rawError = createRpcError({
            meta: metadata,
        });

        const parsed = GrpcTransportError.fromUnknown(rawError)!;

        expect(Object.getPrototypeOf(parsed.metadata)).toBeNull();
        expect(parsed.metadata.__proto__).toEqual(["metadata-value"]);
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

describe("GrpcTransportError ErrorInfo surfacing", () => {
    const utf8 = (value: string): Uint8Array => new TextEncoder().encode(value);

    const lengthDelimited = (field: number, payload: Uint8Array): Uint8Array => {
        expect(payload.length).toBeLessThan(128);

        return Uint8Array.from([field * 8 + 2, payload.length, ...payload]);
    };

    const errorInfoBytes = (reason: string, domain: string, metadata: Record<string, string>): Uint8Array => {
        const parts: number[] = [
            ...lengthDelimited(1, utf8(reason)),
            ...lengthDelimited(2, utf8(domain)),
        ];

        for (const [key, value] of Object.entries(metadata)) {
            const entry = Uint8Array.from([...lengthDelimited(1, utf8(key)), ...lengthDelimited(2, utf8(value))]);

            parts.push(...lengthDelimited(3, entry));
        }

        return Uint8Array.from(parts);
    };

    const statusWith = (details: { typeUrl: string; value: Uint8Array }[], message = "An error occurred. Please contact the operator and inquire about the request tid-1"): Uint8Array =>
        Status.toBinary({ code: 9, message, details });

    it("surfaces the decoded reason and metadata in the error message", () => {
        const bytes = statusWith([
            { typeUrl: "type.googleapis.com/google.rpc.RequestInfo", value: Uint8Array.from([10, 1, 65]) },
            { typeUrl: "type.googleapis.com/google.rpc.ErrorInfo", value: errorInfoBytes("CONTRACT_NOT_FOUND", "participant", { category: "11", test: "yes" }) },
        ]);

        const parsed = GrpcTransportError.fromUnknown(createRpcError({
            message: "An error occurred. Please contact the operator and inquire about the request tid-1",
            meta: { "grpc-status-details-bin": Buffer.from(bytes).toString("base64") },
        } as never));

        // The generic operator message now carries the real reason for every consumer.
        expect(parsed?.message).toContain("reason: CONTRACT_NOT_FOUND (category=11, test=yes)");
        expect(parsed?.errorInfo).toEqual({
            reason: "CONTRACT_NOT_FOUND",
            domain: "participant",
            metadata: { category: "11", test: "yes" },
        });
    });

    it("includes a status message that differs from the transport message", () => {
        const bytes = statusWith(
            [{ typeUrl: "type.googleapis.com/google.rpc.ErrorInfo", value: errorInfoBytes("NO_SYNCHRONIZER", "participant", {}) }],
            "no synchronizer connected",
        );

        const parsed = GrpcTransportError.fromUnknown(createRpcError({
            message: "generic transport text",
            meta: { "grpc-status-details-bin": Buffer.from(bytes).toString("base64") },
        } as never));

        expect(parsed?.message).toContain("[status: no synchronizer connected; reason: NO_SYNCHRONIZER]");
    });

    it("keeps the message unchanged when the details hold no ErrorInfo or malformed bytes", () => {
        const noInfo = GrpcTransportError.fromUnknown(createRpcError({
            meta: { "grpc-status-details-bin": Buffer.from(statusWith([], "the supplied token is invalid")).toString("base64") },
        } as never));

        expect(noInfo?.message).toBe("gRPC UNAUTHENTICATED from com.daml.ledger.api.v2.admin.UserManagementService.ListUsers: the supplied token is invalid");
        expect(noInfo?.errorInfo).toBeUndefined();

        const malformed = GrpcTransportError.fromUnknown(createRpcError({
            meta: {
                "grpc-status-details-bin": Buffer.from(statusWith(
                    [{ typeUrl: "type.googleapis.com/google.rpc.ErrorInfo", value: Uint8Array.from([0x0a, 0x7f, 1, 2]) }],
                    "the supplied token is invalid",
                )).toString("base64"),
            },
        } as never));

        expect(malformed?.errorInfo).toBeUndefined();
        expect(malformed?.message).toBe("gRPC UNAUTHENTICATED from com.daml.ledger.api.v2.admin.UserManagementService.ListUsers: the supplied token is invalid");
    });
});
