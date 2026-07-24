import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    CantonHashPurpose,
    ExternalPartyCryptoKeyFormat,
    TransportKind,
} from "../../../src";

describe("CantonClient hashing utilities", () => {
    it("computes generic Canton hashes and public key fingerprints", () => {
        const client = new CantonClient(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                ledgerEndpoint: "https://ledger.example.com",
            }),
        );
        const rawEd25519PublicKey = new Uint8Array([
            0x01, 0x02, 0x03, 0x04,
            0x05, 0x06, 0x07, 0x08,
            0x09, 0x0a, 0x0b, 0x0c,
            0x0d, 0x0e, 0x0f, 0x10,
            0x11, 0x12, 0x13, 0x14,
            0x15, 0x16, 0x17, 0x18,
            0x19, 0x1a, 0x1b, 0x1c,
            0x1d, 0x1e, 0x1f, 0x20,
        ]);
        const spkiWrappedEd25519PublicKey = new Uint8Array([
            0x30, 0x2a,
            0x30, 0x05,
            0x06, 0x03, 0x2b, 0x65, 0x70,
            0x03, 0x21, 0x00,
            ...rawEd25519PublicKey,
        ]);

        expect(
            Buffer.from(
                client.hashing.computeHash(
                    new Uint8Array([1, 2, 3]),
                    CantonHashPurpose.publicKeyFingerprint,
                ),
            ).toString("hex"),
        ).toBe(
            "122073c069682f595c7c21974e4e6381cb413b08a7e7851296abd38f688d3cb8f1c8",
        );

        expect(
            client.hashing.computeHashHex(
                new Uint8Array([1, 2, 3]),
                CantonHashPurpose.publicKeyFingerprint,
            ),
        ).toBe(
            "122073c069682f595c7c21974e4e6381cb413b08a7e7851296abd38f688d3cb8f1c8",
        );

        expect(CantonHashPurpose.decentralizedNamespace).toBe(37);

        expect(
            client.hashing.computeHashHex(
                new Uint8Array([1, 2, 3]),
                37,
            ),
        ).toBe(
            "1220b7104977a6241b9d0a96caed440c4b35d74d8ae58a12a1d964051d99c62f15d5",
        );

        expect(
            client.hashing.computePublicKeyFingerprint(
                new Uint8Array([1, 2, 3]),
            ),
        ).toBe(
            "122073c069682f595c7c21974e4e6381cb413b08a7e7851296abd38f688d3cb8f1c8",
        );

        expect(
            client.hashing.computePublicKeyFingerprint(
                rawEd25519PublicKey,
            ),
        ).toBe(
            "1220eefa66cb5656ab5dfa2f43dcbbb374c0599d6c6f2fae41987cca7a29b890a17a",
        );

        expect(
            client.hashing.computePublicKeyFingerprint(
                spkiWrappedEd25519PublicKey,
                ExternalPartyCryptoKeyFormat.derX509SubjectPublicKeyInfo,
            ),
        ).toBe(
            "1220eefa66cb5656ab5dfa2f43dcbbb374c0599d6c6f2fae41987cca7a29b890a17a",
        );
    });
});
