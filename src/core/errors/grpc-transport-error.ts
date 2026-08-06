import { Status } from "../../transports/grpc/generated/canton/google/rpc/status.js";
import type { Status as GrpcStatusDetails } from "../../transports/grpc/generated/canton/google/rpc/status.js";
import { TransportError } from "./transport-error.js";

export type GrpcErrorMetadata = Readonly<
    Record<string, readonly string[]>
>;

/** The decoded google.rpc.ErrorInfo detail: the machine-readable reason behind a gRPC failure. */
export interface GrpcErrorInfo {
    readonly reason: string;
    readonly domain: string;
    readonly metadata: Readonly<Record<string, string>>;
}

export type { GrpcStatusDetails };

export class GrpcTransportError extends TransportError {
    public readonly grpcCode: string;
    public readonly serviceName?: string;
    public readonly methodName?: string;
    public readonly metadata: GrpcErrorMetadata;
    public readonly status?: GrpcStatusDetails;
    public readonly errorInfo?: GrpcErrorInfo;
    public override readonly cause: Error;

    private constructor(
        message: string,
        rawError: RpcErrorLike,
        metadata: GrpcErrorMetadata,
        status?: GrpcStatusDetails,
        errorInfo?: GrpcErrorInfo,
    ) {
        super(message);
        this.grpcCode = rawError.code;
        this.serviceName = rawError.serviceName;
        this.methodName = rawError.methodName;
        this.metadata = metadata;
        this.status = status;
        this.errorInfo = errorInfo;
        this.cause = rawError;
    }

    public static fromUnknown(error: unknown): GrpcTransportError | undefined {
        if (!isRpcErrorLike(error)) {
            return undefined;
        }

        const metadata = copyMetadata(error.meta);

        const status = decodeStatusDetails(error.meta);

        const errorInfo = decodeErrorInfo(status);

        return new GrpcTransportError(
            formatMessage(error, status, errorInfo),
            error,
            metadata,
            status,
            errorInfo,
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
    const copied: Record<string, readonly string[]> = Object.create(null);

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

/**
 * Decodes the google.rpc.ErrorInfo entry from a status' packed details. The message type is small and
 * stable (reason/domain/metadata), so it is read directly off the wire instead of adding the whole
 * google.rpc.error_details surface to the generated bindings. Anything malformed yields undefined rather
 * than masking the original RPC failure.
 */
function decodeErrorInfo(status: GrpcStatusDetails | undefined): GrpcErrorInfo | undefined {
    for (const detail of status?.details ?? []) {
        if (typeof detail.typeUrl !== "string" || !detail.typeUrl.endsWith("/google.rpc.ErrorInfo") || !(detail.value instanceof Uint8Array)) {
            continue;
        }

        const decoded = readErrorInfo(detail.value);

        if (decoded !== undefined) {
            return decoded;
        }
    }

    return undefined;
}

function readErrorInfo(bytes: Uint8Array): GrpcErrorInfo | undefined {
    try {
        let reason = "";

        let domain = "";

        const metadata: Record<string, string> = {};

        const reader = wireReader(bytes);

        while (reader.remaining()) {
            const tag = reader.varint();

            const field = Math.floor(tag / 8);

            const wireType = tag % 8;

            if (field === 1 && wireType === 2) {
                reason = reader.string();
            } else if (field === 2 && wireType === 2) {
                domain = reader.string();
            } else if (field === 3 && wireType === 2) {
                const entry = wireReader(reader.bytes());

                let key = "";

                let value = "";

                while (entry.remaining()) {
                    const entryTag = entry.varint();

                    if (Math.floor(entryTag / 8) === 1 && entryTag % 8 === 2) {
                        key = entry.string();
                    } else if (Math.floor(entryTag / 8) === 2 && entryTag % 8 === 2) {
                        value = entry.string();
                    } else {
                        entry.skip(entryTag % 8);
                    }
                }

                if (key.length > 0) {
                    metadata[key] = value;
                }
            } else {
                reader.skip(wireType);
            }
        }

        return reason.length === 0 ? undefined : Object.freeze({ reason, domain, metadata: Object.freeze(metadata) });
    } catch {
        return undefined;
    }
}

function wireReader(bytes: Uint8Array) {
    let offset = 0;

    const varint = (): number => {
        let result = 0;

        let shift = 1;

        for (let index = 0; index < 8; index += 1) {
            const byte = bytes[offset];

            if (byte === undefined) {
                throw new Error("truncated varint");
            }

            offset += 1;
            result += (byte & 0x7f) * shift;

            if ((byte & 0x80) === 0) {
                return result;
            }

            shift *= 128;
        }

        throw new Error("varint too long");
    };

    const rawBytes = (): Uint8Array => {
        const length = varint();

        if (offset + length > bytes.length) {
            throw new Error("truncated bytes");
        }

        const slice = bytes.subarray(offset, offset + length);

        offset += length;

        return slice;
    };

    return {
        remaining: (): boolean => offset < bytes.length,
        varint,
        bytes: rawBytes,
        string: (): string => new TextDecoder("utf-8", { fatal: true }).decode(rawBytes()),
        skip: (wireType: number): void => {
            if (wireType === 0) {
                varint();
            } else if (wireType === 1) {
                offset += 8;
            } else if (wireType === 2) {
                rawBytes();
            } else if (wireType === 5) {
                offset += 4;
            } else {
                throw new Error(`unsupported wire type ${wireType}`);
            }

            if (offset > bytes.length) {
                throw new Error("truncated field");
            }
        },
    };
}

function formatMessage(
    error: RpcErrorLike,
    status: GrpcStatusDetails | undefined,
    errorInfo: GrpcErrorInfo | undefined,
): string {
    const operation = [error.serviceName, error.methodName]
        .filter((part): part is string => part !== undefined)
        .join(".");

    const location = operation.length > 0 ? ` from ${operation}` : "";

    const parts: string[] = [];

    // Participants often pair a generic transport message with the real explanation in the status trailer.
    if (status !== undefined && status.message.length > 0 && status.message !== error.message) {
        parts.push(`status: ${status.message}`);
    }

    if (errorInfo !== undefined) {
        const metadataEntries = Object.entries(errorInfo.metadata);

        parts.push(
            `reason: ${errorInfo.reason}`
                + (metadataEntries.length === 0 ? "" : ` (${metadataEntries.map(([key, value]) => `${key}=${value}`).join(", ")})`),
        );
    }

    const suffix = parts.length === 0 ? "" : ` [${parts.join("; ")}]`;

    return `gRPC ${error.code}${location}: ${error.message}${suffix}`;
}
