import { Status } from "../../transports/grpc/generated/canton/google/rpc/status.js";
import type { Status as GrpcStatusDetails } from "../../transports/grpc/generated/canton/google/rpc/status.js";
import { TransportError } from "./transport-error.js";

export type GrpcErrorMetadata = Readonly<
    Record<string, readonly string[]>
>;

export type { GrpcStatusDetails };

export class GrpcTransportError extends TransportError {
    public readonly grpcCode: string;
    public readonly serviceName?: string;
    public readonly methodName?: string;
    public readonly metadata: GrpcErrorMetadata;
    public readonly status?: GrpcStatusDetails;
    public override readonly cause: Error;

    private constructor(
        message: string,
        rawError: RpcErrorLike,
        metadata: GrpcErrorMetadata,
        status?: GrpcStatusDetails,
    ) {
        super(message);
        this.grpcCode = rawError.code;
        this.serviceName = rawError.serviceName;
        this.methodName = rawError.methodName;
        this.metadata = metadata;
        this.status = status;
        this.cause = rawError;
    }

    public static fromUnknown(error: unknown): GrpcTransportError | undefined {
        if (!isRpcErrorLike(error)) {
            return undefined;
        }

        const metadata = copyMetadata(error.meta);

        const status = decodeStatusDetails(error.meta);

        return new GrpcTransportError(
            formatMessage(error),
            error,
            metadata,
            status,
        );
    }
}

type RpcErrorLike = Error & {
    code: string;
    serviceName?: string;
    methodName?: string;
    meta?: Record<string, unknown>;
};

function isRpcErrorLike(error: unknown): error is RpcErrorLike {
    if (!(error instanceof Error) || error.name !== "RpcError") {
        return false;
    }

    const candidate = error as Partial<RpcErrorLike>;

    return typeof candidate.code === "string";
}

function copyMetadata(metadata: Record<string, unknown> | undefined): GrpcErrorMetadata {
    const copied: Record<string, readonly string[]> = {};

    for (const [key, value] of Object.entries(metadata ?? {})) {
        const strings = asArray(value).filter(
            (metadataValue): metadataValue is string =>
                typeof metadataValue === "string",
        );

        if (strings.length > 0) {
            copied[key] = Object.freeze([...strings]);
        }
    }

    return Object.freeze(copied);
}

function decodeStatusDetails(
    metadata: Record<string, unknown> | undefined,
): GrpcStatusDetails | undefined {
    const values = asArray(metadata?.["grpc-status-details-bin"]);

    for (const value of values) {
        const bytes = toBinary(value);

        if (bytes === undefined) {
            continue;
        }

        try {
            return Status.fromBinary(bytes);
        } catch {
            // Try another trailer value without masking the original RPC failure.
        }
    }

    return undefined;
}

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : value === undefined ? [] : [value];
}

function toBinary(value: unknown): Uint8Array | undefined {
    if (typeof value === "string") {
        return Buffer.from(value, "base64");
    }

    return value instanceof Uint8Array ? value : undefined;
}

function formatMessage(error: RpcErrorLike): string {
    const operation = [error.serviceName, error.methodName]
        .filter((part): part is string => part !== undefined)
        .join(".");

    const location = operation.length > 0 ? ` from ${operation}` : "";

    return `gRPC ${error.code}${location}: ${error.message}`;
}
