import { describe, expect, it } from "vitest";
import { AssembleSignedTopologyTransactionsRequest } from "../../../src";
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
});
