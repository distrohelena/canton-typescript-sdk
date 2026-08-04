import { Buffer } from "node:buffer";

const MAX_CANONICAL_PUBLIC_IDENTITY_BYTES = 43_690;

/**
 * Encodes an arbitrary UTF-8 semantic identity as a positive decimal integer.
 *
 * The leading decimal digit is a sentinel and each byte occupies three decimal
 * digits, so leading NUL bytes and the empty string remain distinct. This is an
 * injective encoding, not a hash.
 */
export function canonicalPublicNumericIdentity(identity: string): string {
    const bytes = Buffer.from(identity, "utf8");

    if (bytes.length > MAX_CANONICAL_PUBLIC_IDENTITY_BYTES) {
        throw new RangeError(`Canonical public identity exceeds ${MAX_CANONICAL_PUBLIC_IDENTITY_BYTES} UTF-8 bytes`);
    }

    let value = "1";

    for (const byte of bytes) {
        value += byte.toString().padStart(3, "0");
    }

    return value;
}

/** Frames multiple semantic components without a delimiter ambiguity. */
export function canonicalPublicNumericIdentityParts(parts: readonly string[]): string {
    return canonicalPublicNumericIdentity(parts.map((part) => `${Buffer.byteLength(part, "utf8")}:${part}`).join(""));
}

/** PostgreSQL expression exactly equivalent to {@link canonicalPublicNumericIdentity}. */
export function compileCanonicalPublicNumericIdentitySql(text: string): string {
    const bytes = `convert_to((${text})::text, 'UTF8')`;

    const encoded = `('1' || coalesce((select string_agg(lpad(get_byte(canonical_identity_bytes, canonical_identity_byte)::text, 3, '0'), '' order by canonical_identity_byte) from generate_series(0, octet_length(canonical_identity_bytes) - 1) as canonical_identity_byte), ''))::numeric`;

    const overflow = `('1' || repeat('0', octet_length(canonical_identity_bytes) * 3))::numeric`;

    return `(select case when octet_length(canonical_identity_bytes) <= ${MAX_CANONICAL_PUBLIC_IDENTITY_BYTES} then ${encoded} else ${overflow} end from (select ${bytes} as canonical_identity_bytes) canonical_identity)`;
}

/** PostgreSQL framing equivalent to {@link canonicalPublicNumericIdentityParts}. */
export function compileCanonicalPublicNumericIdentityPartsSql(parts: readonly string[]): string {
    return `concat(${parts.flatMap((part) => [`octet_length(convert_to((${part})::text, 'UTF8'))`, "':'", `(${part})::text`]).join(", ")})`;
}
