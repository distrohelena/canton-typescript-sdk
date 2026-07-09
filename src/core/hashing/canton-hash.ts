import { createHash } from "node:crypto";
import { CantonHashPurpose } from "../types/canton-hash-purpose.js";

const sha256MultihashPrefix = new Uint8Array([0x12, 0x20]);
const asn1SequenceTag = 0x30;
const asn1ObjectIdentifierTag = 0x06;
const asn1BitStringTag = 0x03;
const ed25519ObjectIdentifier = new Uint8Array([0x2b, 0x65, 0x70]);
const derX509SubjectPublicKeyInfoFormat = "derX509SubjectPublicKeyInfo";

export function computeCantonHash(
    content: Uint8Array,
    purpose: number,
): Uint8Array {
    const purposePrefix = Buffer.alloc(4);
    purposePrefix.writeUInt32BE(purpose, 0);

    const digest = createHash("sha256")
        .update(purposePrefix)
        .update(content)
        .digest();

    return new Uint8Array(
        Buffer.concat([
            Buffer.from(sha256MultihashPrefix),
            digest,
        ]),
    );
}

export function computeCantonHashHex(
    content: Uint8Array,
    purpose: number,
): string {
    return Buffer.from(computeCantonHash(content, purpose)).toString("hex");
}

export function computeCantonPublicKeyFingerprint(
    publicKey: Uint8Array | undefined,
    format?: string,
): string | undefined {
    if (publicKey === undefined || publicKey.length === 0) {
        return undefined;
    }

    return computeCantonHashHex(
        normalizePublicKeyForFingerprint(publicKey, format),
        CantonHashPurpose.publicKeyFingerprint,
    );
}

function normalizePublicKeyForFingerprint(
    publicKey: Uint8Array,
    format?: string,
): Uint8Array {
    if (format !== derX509SubjectPublicKeyInfoFormat) {
        return publicKey;
    }

    return tryExtractEd25519PublicKeyFromSpki(publicKey) ?? publicKey;
}

function tryExtractEd25519PublicKeyFromSpki(
    spki: Uint8Array,
): Uint8Array | undefined {
    try {
        const outer = readAsn1Element(spki, 0);

        if (outer.tag !== asn1SequenceTag) {
            return undefined;
        }

        const algorithm = readAsn1Element(spki, outer.contentOffset);

        if (algorithm.tag !== asn1SequenceTag) {
            return undefined;
        }

        const algorithmIdentifier = readAsn1Element(
            spki,
            algorithm.contentOffset,
        );

        if (
            algorithmIdentifier.tag !== asn1ObjectIdentifierTag
            || !bytesEqual(
                spki.subarray(
                    algorithmIdentifier.contentOffset,
                    algorithmIdentifier.endOffset,
                ),
                ed25519ObjectIdentifier,
            )
        ) {
            return undefined;
        }

        const subjectPublicKey = readAsn1Element(spki, algorithm.endOffset);

        if (subjectPublicKey.tag !== asn1BitStringTag) {
            return undefined;
        }

        const bitString = spki.subarray(
            subjectPublicKey.contentOffset,
            subjectPublicKey.endOffset,
        );

        if (bitString.length !== 33 || bitString[0] !== 0) {
            return undefined;
        }

        return bitString.subarray(1);
    } catch {
        return undefined;
    }
}

function readAsn1Element(
    bytes: Uint8Array,
    offset: number,
): {
    tag: number;
    contentOffset: number;
    endOffset: number;
} {
    if (offset + 2 > bytes.length) {
        throw new Error("ASN.1 element header is truncated.");
    }

    const tag = bytes[offset];
    const lengthResult = readAsn1Length(bytes, offset + 1);
    const contentOffset = lengthResult.nextOffset;
    const endOffset = contentOffset + lengthResult.length;

    if (endOffset > bytes.length) {
        throw new Error("ASN.1 element content is truncated.");
    }

    return {
        tag,
        contentOffset,
        endOffset,
    };
}

function readAsn1Length(
    bytes: Uint8Array,
    offset: number,
): {
    length: number;
    nextOffset: number;
} {
    if (offset >= bytes.length) {
        throw new Error("ASN.1 length is truncated.");
    }

    const firstByte = bytes[offset];

    if ((firstByte & 0x80) === 0) {
        return {
            length: firstByte,
            nextOffset: offset + 1,
        };
    }

    const lengthByteCount = firstByte & 0x7f;

    if (lengthByteCount === 0 || lengthByteCount > 4) {
        throw new Error("ASN.1 length encoding is unsupported.");
    }

    if (offset + 1 + lengthByteCount > bytes.length) {
        throw new Error("ASN.1 long-form length is truncated.");
    }

    let length = 0;

    for (let index = 0; index < lengthByteCount; index += 1) {
        length = (length << 8) | bytes[offset + 1 + index];
    }

    return {
        length,
        nextOffset: offset + 1 + lengthByteCount,
    };
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
    if (left.length !== right.length) {
        return false;
    }

    for (let index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index]) {
            return false;
        }
    }

    return true;
}
