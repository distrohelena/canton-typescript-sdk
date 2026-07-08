import {
    computeCantonHash,
    computeCantonHashHex,
} from "../core/hashing/canton-hash.js";
import { CantonHashPurpose } from "../core/types/canton-hash-purpose.js";

export class CantonHashingClient {
    /** Computes a Canton multihash for the provided content and hash purpose. */
    public computeHash(
        content: Uint8Array,
        purpose: number,
    ): Uint8Array {
        return computeCantonHash(content, purpose);
    }

    /** Computes a Canton multihash as lowercase hexadecimal for the provided content and hash purpose. */
    public computeHashHex(
        content: Uint8Array,
        purpose: number,
    ): string {
        return computeCantonHashHex(content, purpose);
    }

    /** Computes the canonical Canton public-key fingerprint from serialized public key bytes. */
    public computePublicKeyFingerprint(
        publicKey: Uint8Array,
    ): string {
        return computeCantonHashHex(
            publicKey,
            CantonHashPurpose.publicKeyFingerprint,
        );
    }
}
