import { computeCantonHashHex, computeCantonPublicKeyFingerprint } from "../../core/hashing/canton-hash.js";
import { ValidationError } from "../../core/errors/validation-error.js";
import { CantonHashPurpose } from "../../core/types/canton-hash-purpose.js";
import { CreateDecentralizedPartyRequest, DecentralizedPartyKey } from "../../core/types/requests/create-decentralized-party-request.js";
import { PreparedDecentralizedParty } from "../../core/types/requests/finalize-decentralized-party-request.js";
import { PreparedTopologyTransaction } from "../../core/types/topology/prepared-topology-transaction.js";
import { GetParticipantIdResponse } from "../../core/types/responses/get-participant-id-response.js";
import { RequestOptions } from "../../core/types/request-options.js";
import {
    CryptoKeyFormat,
    SigningKeyScheme,
    SigningKeySpec,
    SigningKeyUsage,
    SigningPublicKey,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/crypto/v30/crypto.js";
import {
    Enums_ParticipantPermission,
    Enums_TopologyChangeOp,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/protocol/v30/topology.js";
import { GenerateTransactionsRequest } from "../../transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.js";
import { TopologyManagerWriteServiceClient } from "../topology-manager-write/topology-manager-write-service-client.js";

export async function prepareDecentralizedPartyAsync(
    request: CreateDecentralizedPartyRequest,
    localParticipant: GetParticipantIdResponse,
    topologyWriter: TopologyManagerWriteServiceClient,
    options?: RequestOptions,
): Promise<PreparedDecentralizedParty> {
    const ownerFingerprints = request.owners.map(fingerprintFor);

    const decentralizedNamespace = deriveNamespace(ownerFingerprints);

    const partyId = `${request.partyHint}::${decentralizedNamespace}`;

    const owners = request.owners.map(toTopologyKey);

    const partyKeys = request.partySigningKeys.map(toTopologyKey);

    const store = {
        store: {
            oneofKind: "synchronizer" as const,
            synchronizer: {
                kind: {
                    oneofKind: "id" as const,
                    id: request.synchronizer,
                },
            },
        },
    };

    const participants = [
        {
            participantUid: localParticipant.participantId,
            permission: request.localParticipantObservationOnly
                ? Enums_ParticipantPermission.OBSERVATION
                : Enums_ParticipantPermission.CONFIRMATION,
        },
        ...request.otherConfirmingParticipantUids.map((participantUid) =>
            ({ participantUid, permission: Enums_ParticipantPermission.CONFIRMATION }),
        ),
        ...request.observingParticipantUids.map((participantUid) =>
            ({ participantUid, permission: Enums_ParticipantPermission.OBSERVATION }),
        ),
    ];

    const generated = await topologyWriter.generateTransactionsAsync(
        GenerateTransactionsRequest.create({
            proposals: [
                {
                    operation: Enums_TopologyChangeOp.ADD_REPLACE,
                    serial: 1,
                    store,
                    mapping: {
                        mapping: {
                            oneofKind: "decentralizedNamespaceDefinition",
                            decentralizedNamespaceDefinition: {
                                decentralizedNamespace,
                                threshold: request.ownerThreshold,
                                owners: ownerFingerprints,
                            },
                        },
                    },
                },
                ...owners.map((targetKey, index) => ({
                    operation: Enums_TopologyChangeOp.ADD_REPLACE,
                    serial: 1,
                    store,
                    mapping: {
                        mapping: {
                            oneofKind: "namespaceDelegation" as const,
                            namespaceDelegation: {
                                namespace: ownerFingerprints[index],
                                targetKey,
                                isRootDelegation: true,
                                restriction: { oneofKind: undefined },
                            },
                        },
                    },
                })),
                {
                    operation: Enums_TopologyChangeOp.ADD_REPLACE,
                    serial: 1,
                    store,
                    mapping: {
                        mapping: {
                            oneofKind: "partyToParticipant",
                            partyToParticipant: {
                                party: partyId,
                                threshold: request.confirmationThreshold,
                                participants,
                                partySigningKeys: {
                                    threshold: request.partySigningThreshold,
                                    keys: partyKeys,
                                },
                            },
                        },
                    },
                },
            ],
        }),
        options,
    );

    if (generated.generatedTransactions.length !== owners.length + 2) {
        throw new ValidationError("decentralized party generated transaction count does not match proposals");
    }

    const transactions = generated.generatedTransactions.map((transaction) =>
        new PreparedTopologyTransaction({
            serializedTransaction: transaction.serializedTransaction,
            transactionHash: transaction.transactionHash,
        }),
    );

    const signingRequests = transactions.flatMap((transaction, index) => {
        const ownerRequests = ownerFingerprints.map((publicKeyFingerprint) => ({
            id: `${index}:owner:${publicKeyFingerprint}`,
            transactionHash: transaction.transactionHash,
            payload: transaction.transactionHash,
            publicKeyFingerprint,
            role: "owner" as const,
        }));

        return index === transactions.length - 1
            ? [...ownerRequests, ...request.partySigningKeys.map((key) => ({
                id: `${index}:partySigningKey:${fingerprintFor(key)}`,
                transactionHash: transaction.transactionHash,
                payload: transaction.transactionHash,
                publicKeyFingerprint: fingerprintFor(key),
                role: "partySigningKey" as const,
            }))]
            : ownerRequests;
    });

    return new PreparedDecentralizedParty({
        synchronizer: request.synchronizer,
        partyId,
        decentralizedNamespace,
        ownerThreshold: request.ownerThreshold,
        partySigningThreshold: request.partySigningThreshold,
        identityProviderId: request.identityProviderId,
        waitForAllocation: request.waitForAllocation,
        userId: request.userId,
        transactions,
        signingRequests,
    });
}

function fingerprintFor(value: DecentralizedPartyKey): string {
    const fingerprint = computeCantonPublicKeyFingerprint(value.publicKey.keyData, value.publicKey.format);

    if (fingerprint === undefined) {
        throw new ValidationError("decentralized party key requires public key material");
    }

    return fingerprint;
}

function deriveNamespace(ownerFingerprints: readonly string[]): string {
    const encoder = new TextEncoder();

    const chunks = [...ownerFingerprints].sort().flatMap((fingerprint) => {
        const bytes = encoder.encode(fingerprint);

        const length = new Uint8Array(4);

        new DataView(length.buffer).setUint32(0, bytes.length);

        return [...length, ...bytes];
    });

    return computeCantonHashHex(new Uint8Array(chunks), CantonHashPurpose.decentralizedNamespace);
}

function toTopologyKey(value: DecentralizedPartyKey): SigningPublicKey {
    return {
        format: mapCryptoKeyFormat(value.publicKey.format),
        publicKey: new Uint8Array(value.publicKey.keyData),
        scheme: mapSigningKeyScheme(value.publicKey.keySpec),
        usage: [
            SigningKeyUsage.NAMESPACE,
            SigningKeyUsage.PROTOCOL,
            SigningKeyUsage.PROOF_OF_OWNERSHIP,
        ],
        keySpec: mapSigningKeySpec(value.publicKey.keySpec),
    };
}

function mapCryptoKeyFormat(value?: string): CryptoKeyFormat {
    switch (value) {
        case "der": return CryptoKeyFormat.DER;
        case "raw": return CryptoKeyFormat.RAW;
        case "derX509SubjectPublicKeyInfo": return CryptoKeyFormat.DER_X509_SUBJECT_PUBLIC_KEY_INFO;
        case "derPkcs8PrivateKeyInfo": return CryptoKeyFormat.DER_PKCS8_PRIVATE_KEY_INFO;
        case "symbolic": return CryptoKeyFormat.SYMBOLIC;
        default: return CryptoKeyFormat.UNSPECIFIED;
    }
}

function mapSigningKeySpec(value?: string): SigningKeySpec {
    switch (value) {
        case "ecCurve25519": return SigningKeySpec.EC_CURVE25519;
        case "ecP256": return SigningKeySpec.EC_P256;
        case "ecP384": return SigningKeySpec.EC_P384;
        case "ecSecp256k1": return SigningKeySpec.EC_SECP256K1;
        case "mlDsa65": return SigningKeySpec.ML_DSA_65;
        default: return SigningKeySpec.UNSPECIFIED;
    }
}

function mapSigningKeyScheme(keySpec?: string): SigningKeyScheme {
    switch (keySpec) {
        case "ecCurve25519": return SigningKeyScheme.ED25519;
        case "ecP256": return SigningKeyScheme.EC_DSA_P256;
        case "ecP384": return SigningKeyScheme.EC_DSA_P384;
        default: return SigningKeyScheme.UNSPECIFIED;
    }
}
