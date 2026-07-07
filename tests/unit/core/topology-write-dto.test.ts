import { describe, expect, it } from "vitest";
import {
    AssembleSignedTopologyTransactionsRequest,
    ExternalTopologySignature,
    GenerateTopologyTransactionsRequest,
    PartyToParticipant,
    TopologyMappingOperation,
    TopologySignatureFormat,
    TopologySigningKeysWithThreshold,
} from "../../../src";

describe("topology write dto core", () => {
    it("constructs topology write request and detached signature models", () => {
        const request = new GenerateTopologyTransactionsRequest({
            proposals: [
                {
                    operation: TopologyMappingOperation.addReplace,
                    serial: 1,
                    mapping: new PartyToParticipant({
                        party: "ExternalParty::default",
                        threshold: 1,
                        participants: [],
                        partySigningKeys: new TopologySigningKeysWithThreshold({
                            threshold: 1,
                            keys: [],
                        }),
                    }),
                },
            ],
        });

        const signature = new ExternalTopologySignature({
            transactionHash: new Uint8Array([1, 2, 3]),
            signature: new Uint8Array([4, 5, 6]),
            signedByFingerprint: "fingerprint::1",
            signatureFormat: TopologySignatureFormat.ed25519,
        });

        const assembleRequest = new AssembleSignedTopologyTransactionsRequest({
            preparedTransactions: [],
            signatures: [signature],
        });

        expect(request.proposals[0].mapping).toBeInstanceOf(PartyToParticipant);
        expect(request.proposals[0].serial).toBe(1);
        expect(signature.signatureFormat).toBe(TopologySignatureFormat.ed25519);
        expect(assembleRequest.signatures).toHaveLength(1);
    });
});
