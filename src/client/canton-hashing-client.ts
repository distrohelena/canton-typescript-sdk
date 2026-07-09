import {
    computeCantonHash,
    computeCantonHashHex,
    computeCantonPublicKeyFingerprint,
} from "../core/hashing/canton-hash.js";
import { ExternalPartyCryptoKeyFormat } from "../core/types/external-party/external-party-crypto-key-format.js";

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
        format?: ExternalPartyCryptoKeyFormat,
    ): string {
        return computeCantonPublicKeyFingerprint(publicKey, format) ?? "";
    }
}
