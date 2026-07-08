import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    CantonHashPurpose,
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

        expect(
            client.hashing.computePublicKeyFingerprint(
                new Uint8Array([1, 2, 3]),
            ),
        ).toBe(
            "122073c069682f595c7c21974e4e6381cb413b08a7e7851296abd38f688d3cb8f1c8",
        );
    });
});
