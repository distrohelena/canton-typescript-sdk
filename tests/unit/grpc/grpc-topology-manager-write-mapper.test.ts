import { describe, expect, it } from "vitest";
import {
    DecentralizedNamespaceDefinition,
    GenerateTopologyTransactionsRequest,
    GeneratedTopologyTransaction,
    NamespaceDelegation,
    PartyToParticipant,
    PartyToParticipantOnboarding,
    PartyToParticipantParticipant,
    ParticipantPermission,
    SignedTopologyTransaction,
    TopologyMappingOperation,
    TopologySignatureFormat,
    TopologySigningKeysWithThreshold,
    TopologySigningPublicKey,
    TopologyTransactionSignature,
} from "../../../src";
import {
    mapGrpcGenerateTopologyTransactionsRequest,
    mapGrpcGenerateTopologyTransactionsResponse,
} from "../../../src/transports/grpc/mappers/topology-manager-write-mapper.js";

describe("gRPC topology manager write mappers", () => {
    it("maps topology transaction generation requests", () => {
        const request = new GenerateTopologyTransactionsRequest({
            proposals: [
                {
                    operation: TopologyMappingOperation.addReplace,
                    serial: 1,
                    mapping: new PartyToParticipant({
                        party: "ExternalParty::default",
                        threshold: 1,
                        participants: [
                            new PartyToParticipantParticipant({
                                participantUid: "participant1::example",
                                permission: ParticipantPermission.submission,
                                onboarding: new PartyToParticipantOnboarding(),
                            }),
                        ],
                        partySigningKeys: new TopologySigningKeysWithThreshold({
                            threshold: 1,
                            keys: [
                                new TopologySigningPublicKey({
                                    format: "raw",
                                    scheme: "ed25519",
                                    usage: ["protocol"],
                                    keySpec: "ecCurve25519",
                                    publicKey: new Uint8Array([1, 2, 3]),
                                }),
                            ],
                        }),
                    }),
                },
            ],
        });

        const result = mapGrpcGenerateTopologyTransactionsRequest(request);

        expect(result.proposals).toHaveLength(1);
        expect(result.proposals[0].mapping?.mapping.oneofKind).toBe(
            "partyToParticipant",
        );
        expect(
            result.proposals[0].mapping?.mapping.partyToParticipant
                .partySigningKeys?.keys[0].usage,
        ).toEqual([4]);
    });

    it("maps decentralized namespace and root-delegation proposals", () => {
        const ownerKey = new TopologySigningPublicKey({
            format: "raw",
            publicKey: new Uint8Array([1, 2, 3]),
            usage: ["namespace"],
            keySpec: "ecSecp256k1",
        });

        const result = mapGrpcGenerateTopologyTransactionsRequest(
            new GenerateTopologyTransactionsRequest({
                proposals: [
                    {
                        operation: TopologyMappingOperation.addReplace,
                        serial: 1,
                        mapping: new DecentralizedNamespaceDefinition({
                            decentralizedNamespace: "decentralized-namespace",
                            threshold: 2,
                            owners: ["owner-a", "owner-b"],
                        }),
                    },
                    {
                        operation: TopologyMappingOperation.addReplace,
                        serial: 1,
                        mapping: new NamespaceDelegation({
                            namespace: "decentralized-namespace",
                            targetKey: ownerKey,
                            isRootDelegation: true,
                        }),
                    },
                ],
            }),
        );

        expect(result.proposals[0].mapping?.mapping.oneofKind).toBe(
            "decentralizedNamespaceDefinition",
        );
        expect(result.proposals[1].mapping?.mapping.oneofKind).toBe(
            "namespaceDelegation",
        );
        expect(
            result.proposals[1].mapping?.mapping.namespaceDelegation
                ?.targetKey?.keySpec,
        ).toBe(4);
        expect(
            result.proposals[1].mapping?.mapping.namespaceDelegation
                ?.targetKey?.scheme,
        ).toBe(0);
    });

    it("maps generated topology transaction responses", () => {
        const response = mapGrpcGenerateTopologyTransactionsResponse({
            generatedTransactions: [
                {
                    serializedTransaction: new Uint8Array([1, 2, 3]),
                    transactionHash: new Uint8Array([4, 5, 6]),
                },
            ],
        });

        expect(response.generatedTransactions[0]).toBeInstanceOf(
            GeneratedTopologyTransaction,
        );
        expect(response.generatedTransactions[0].transactionHash).toEqual(
            new Uint8Array([4, 5, 6]),
        );
        expect(TopologySignatureFormat.ed25519).toBe("ed25519");
    });

});
