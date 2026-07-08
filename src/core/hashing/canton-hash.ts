import { createHash } from "node:crypto";
import { CantonHashPurpose } from "../types/canton-hash-purpose.js";

const sha256MultihashPrefix = new Uint8Array([0x12, 0x20]);

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
): string | undefined {
    if (publicKey === undefined || publicKey.length === 0) {
        return undefined;
    }

    return computeCantonHashHex(publicKey, CantonHashPurpose.publicKeyFingerprint);
}
