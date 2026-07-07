import { describe, expect, it } from "vitest";
import {
    AssembleSignedTopologyTransactionsRequest,
    ExternalTopologySignature,
    PreparedTopologyTransaction,
    TopologySignatureFormat,
} from "../../../src";
import { assembleSignedTopologyTransactions } from "../../../src/services/topology-manager-write/topology-signed-transaction-assembler.js";

describe("topology signed transaction assembler", () => {
    it("accepts an empty detached-signature request", () => {
        expect(() =>
            assembleSignedTopologyTransactions(
                new AssembleSignedTopologyTransactionsRequest({
                    preparedTransactions: [],
                    signatures: [],
                }),
            ),
        ).not.toThrow();
    });

    it("assembles one prepared transaction with one detached signature", () => {
        const result = assembleSignedTopologyTransactions(
            new AssembleSignedTopologyTransactionsRequest({
                preparedTransactions: [
                    new PreparedTopologyTransaction({
                        serializedTransaction: new Uint8Array([1, 2]),
                        transactionHash: new Uint8Array([3, 4]),
                        proposal: false,
                    }),
                ],
                signatures: [
                    new ExternalTopologySignature({
                        transactionHash: new Uint8Array([3, 4]),
                        signature: new Uint8Array([9, 9]),
                        signedByFingerprint: "fingerprint::1",
                        signatureFormat: TopologySignatureFormat.ed25519,
                    }),
                ],
            }),
        );

        expect(result).toHaveLength(1);
        expect(result[0].signatures).toHaveLength(1);
        expect(result[0].proposal).toBe(false);
    });

    it("throws when a detached signature does not match any prepared transaction", () => {
        expect(() =>
            assembleSignedTopologyTransactions(
                new AssembleSignedTopologyTransactionsRequest({
                    preparedTransactions: [
                        new PreparedTopologyTransaction({
                            serializedTransaction: new Uint8Array([1, 2]),
                            transactionHash: new Uint8Array([3, 4]),
                        }),
                    ],
                    signatures: [
                        new ExternalTopologySignature({
                            transactionHash: new Uint8Array([7, 8]),
                            signature: new Uint8Array([9]),
                            signedByFingerprint: "fingerprint::1",
                            signatureFormat: TopologySignatureFormat.ed25519,
                        }),
                    ],
                }),
            ),
        ).toThrow(/prepared transaction/i);
    });

    it("throws when the same signer signs the same transaction twice", () => {
        expect(() =>
            assembleSignedTopologyTransactions(
                new AssembleSignedTopologyTransactionsRequest({
                    preparedTransactions: [
                        new PreparedTopologyTransaction({
                            serializedTransaction: new Uint8Array([1, 2]),
                            transactionHash: new Uint8Array([3, 4]),
                        }),
                    ],
                    signatures: [
                        new ExternalTopologySignature({
                            transactionHash: new Uint8Array([3, 4]),
                            signature: new Uint8Array([9]),
                            signedByFingerprint: "fingerprint::1",
                            signatureFormat: TopologySignatureFormat.ed25519,
                        }),
                        new ExternalTopologySignature({
                            transactionHash: new Uint8Array([3, 4]),
                            signature: new Uint8Array([8]),
                            signedByFingerprint: "fingerprint::1",
                            signatureFormat: TopologySignatureFormat.ed25519,
                        }),
                    ],
                }),
            ),
        ).toThrow(/duplicate/i);
    });
});
