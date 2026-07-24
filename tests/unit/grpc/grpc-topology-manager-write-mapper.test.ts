import { describe, expect, it } from "vitest";
import {
    AddTopologyTransactionsRequest,
    AuthorizeTopologyTransactionsRequest,
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
    AuthorizeRequest,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.js";
import {
    mapGrpcAddTopologyTransactionsRequest,
    mapGrpcAuthorizeTopologyTransactionsRequest,
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

    it("maps signed topology transaction requests and generated responses", () => {
        const addRequest = mapGrpcAddTopologyTransactionsRequest(
            new AddTopologyTransactionsRequest({
                transactions: [
                    new SignedTopologyTransaction({
                        transaction: new Uint8Array([1, 2, 3]),
                        signatures: [
                            new TopologyTransactionSignature({
                                format: "concat",
                                signature: new Uint8Array([4, 5, 6]),
                                signedByFingerprint: "fingerprint::1",
                                signingAlgorithmSpec: "ed25519",
                            }),
                        ],
                    }),
                ],
            }),
        );

        const response = mapGrpcGenerateTopologyTransactionsResponse({
            generatedTransactions: [
                {
                    serializedTransaction: new Uint8Array([1, 2, 3]),
                    transactionHash: new Uint8Array([4, 5, 6]),
                },
            ],
        });

        expect(addRequest.transactions).toHaveLength(1);
        expect(addRequest.transactions[0].signatures[0].signedBy).toBe(
            "fingerprint::1",
        );
        expect(addRequest.transactions[0].signatures[0].format).toBe(3);
        expect(response.generatedTransactions[0]).toBeInstanceOf(
            GeneratedTopologyTransaction,
        );
        expect(response.generatedTransactions[0].transactionHash).toEqual(
            new Uint8Array([4, 5, 6]),
        );
        expect(TopologySignatureFormat.ed25519).toBe("ed25519");
    });

    it("serializes authorize requests with raw party signing keys", () => {
        const request = new AuthorizeTopologyTransactionsRequest({
            proposal: {
                operation: TopologyMappingOperation.addReplace,
                mapping: new PartyToParticipant({
                    party: "ed25519_party::fingerprint",
                    threshold: 2,
                    participants: [
                        new PartyToParticipantParticipant({
                            participantUid: "participant1::example",
                            permission: ParticipantPermission.confirmation,
                        }),
                        new PartyToParticipantParticipant({
                            participantUid: "participant2::example",
                            permission: ParticipantPermission.confirmation,
                        }),
                    ],
                    partySigningKeys: new TopologySigningKeysWithThreshold({
                        threshold: 1,
                        keys: [
                            new TopologySigningPublicKey({
                                format: "derX509SubjectPublicKeyInfo",
                                usage: [
                                    "namespace",
                                    "proofOfOwnership",
                                    "protocol",
                                ],
                                keySpec: "ecCurve25519",
                                publicKey: new Uint8Array([1, 2, 3]),
                            }),
                        ],
                    }),
                }),
            },
            mustFullyAuthorize: true,
        });

        const mapped = mapGrpcAuthorizeTopologyTransactionsRequest(request);

        expect(() => AuthorizeRequest.toBinary(mapped)).not.toThrow();
    });
});
