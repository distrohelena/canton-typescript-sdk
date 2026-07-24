import { computeCantonHashHex, computeCantonPublicKeyFingerprint } from "../../core/hashing/canton-hash.js";
import { ValidationError } from "../../core/errors/validation-error.js";
import { CantonHashPurpose } from "../../core/types/canton-hash-purpose.js";
import { CreateDecentralizedPartyRequest, DecentralizedPartyKey } from "../../core/types/requests/create-decentralized-party-request.js";
import { PreparedDecentralizedParty } from "../../core/types/requests/finalize-decentralized-party-request.js";
import { GenerateTopologyTransactionsRequest } from "../../core/types/requests/generate-topology-transactions-request.js";
import { DecentralizedNamespaceDefinition } from "../../core/types/topology/decentralized-namespace-definition.js";
import { NamespaceDelegation } from "../../core/types/topology/namespace-delegation.js";
import { PartyToParticipant, PartyToParticipantParticipant } from "../../core/types/topology/party-to-participant.js";
import { ParticipantPermission } from "../../core/types/topology/participant-permission.js";
import { TopologyMappingOperation } from "../../core/types/topology/topology-mapping-operation.js";
import { TopologySigningKeysWithThreshold, TopologySigningPublicKey } from "../../core/types/topology/topology-public-key.js";
import { GetParticipantIdResponse } from "../../core/types/responses/get-participant-id-response.js";
import { RequestOptions } from "../../core/types/request-options.js";
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
    const participants = [
        new PartyToParticipantParticipant({
            participantUid: localParticipant.participantId,
            permission: request.localParticipantObservationOnly
                ? ParticipantPermission.observation
                : ParticipantPermission.confirmation,
        }),
        ...request.otherConfirmingParticipantUids.map((participantUid) =>
            new PartyToParticipantParticipant({ participantUid, permission: ParticipantPermission.confirmation }),
        ),
        ...request.observingParticipantUids.map((participantUid) =>
            new PartyToParticipantParticipant({ participantUid, permission: ParticipantPermission.observation }),
        ),
    ];
    const generated = await topologyWriter.generateTransactionsAsync(
        new GenerateTopologyTransactionsRequest({
            proposals: [
                { operation: TopologyMappingOperation.addReplace, serial: 1, mapping: new DecentralizedNamespaceDefinition({ decentralizedNamespace, threshold: request.ownerThreshold, owners: ownerFingerprints }) },
                ...owners.map((targetKey) => ({ operation: TopologyMappingOperation.addReplace, serial: 1, mapping: new NamespaceDelegation({ namespace: decentralizedNamespace, targetKey, isRootDelegation: true }) })),
                { operation: TopologyMappingOperation.addReplace, serial: 1, mapping: new PartyToParticipant({ party: partyId, threshold: request.confirmationThreshold, participants, partySigningKeys: new TopologySigningKeysWithThreshold({ threshold: request.partySigningThreshold, keys: partyKeys }) }) },
            ],
        }),
        options,
    );
    if (generated.generatedTransactions.length !== owners.length + 2) {
        throw new ValidationError("decentralized party generated transaction count does not match proposals");
    }
    return new PreparedDecentralizedParty({ partyId, decentralizedNamespace, ownerThreshold: request.ownerThreshold, partySigningThreshold: request.partySigningThreshold });
}

function fingerprintFor(value: DecentralizedPartyKey): string {
    const fingerprint = computeCantonPublicKeyFingerprint(value.publicKey.keyData, value.publicKey.format);
    if (fingerprint === undefined) throw new ValidationError("decentralized party key requires public key material");
    return fingerprint;
}

function deriveNamespace(ownerFingerprints: readonly string[]): string {
    const encoder = new TextEncoder();
    const chunks = [...ownerFingerprints].sort().flatMap((fingerprint) => {
        const bytes = encoder.encode(fingerprint); const length = new Uint8Array(4); new DataView(length.buffer).setUint32(0, bytes.length);
        return [...length, ...bytes];
    });
    return computeCantonHashHex(new Uint8Array(chunks), CantonHashPurpose.decentralizedNamespace);
}

function toTopologyKey(value: DecentralizedPartyKey): TopologySigningPublicKey {
    return new TopologySigningPublicKey({ format: value.publicKey.format, publicKey: value.publicKey.keyData, keySpec: value.publicKey.keySpec, usage: ["namespace", "protocol", "proofOfOwnership"] });
}
