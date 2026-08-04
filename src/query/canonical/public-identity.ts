import { Buffer } from "node:buffer";

/**
 * Encodes an arbitrary UTF-8 semantic identity as a positive decimal integer.
 *
 * The leading base-256 digit is a sentinel, so leading NUL bytes and the empty
 * string remain distinct. This is an injective encoding, not a hash.
 */
export function canonicalPublicNumericIdentity(identity: string): string {
    let value = 1n;

    for (const byte of Buffer.from(identity, "utf8")) {
        value = value * 256n + BigInt(byte);
    }

    return value.toString();
}

/** Frames multiple semantic components without a delimiter ambiguity. */
export function canonicalPublicNumericIdentityParts(parts: readonly string[]): string {
    return canonicalPublicNumericIdentity(parts.map((part) => `${Buffer.byteLength(part, "utf8")}:${part}`).join(""));
}

/** PostgreSQL expression exactly equivalent to {@link canonicalPublicNumericIdentity}. */
export function compileCanonicalPublicNumericIdentitySql(text: string): string {
    const bytes = `convert_to(${text}, 'UTF8')`;

    const length = `octet_length(${bytes})`;

    const byte = `get_byte(${bytes}, canonical_identity_byte)`;

    return `trunc(power(256::numeric, ${length}) + coalesce((select sum(${byte} * power(256::numeric, ${length} - canonical_identity_byte - 1)) from generate_series(0, ${length} - 1) as canonical_identity_byte), 0))`;
}

/** PostgreSQL framing equivalent to {@link canonicalPublicNumericIdentityParts}. */
export function compileCanonicalPublicNumericIdentityPartsSql(parts: readonly string[]): string {
    return `concat(${parts.flatMap((part) => [`octet_length(convert_to(${part}, 'UTF8'))`, "':'", part]).join(", ")})`;
}
