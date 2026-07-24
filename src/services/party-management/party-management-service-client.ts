import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { AllocateExternalPartyRequest } from "../../core/types/requests/allocate-external-party-request.js";
import { AllocatePartyRequest } from "../../core/types/requests/allocate-party-request.js";
import { CreateExternalPartyRequest } from "../../core/types/requests/create-external-party-request.js";
import { CreateDecentralizedPartyRequest } from "../../core/types/requests/create-decentralized-party-request.js";
import { GenerateExternalPartyTopologyRequest } from "../../core/types/requests/generate-external-party-topology-request.js";
import { AllocateExternalPartyResponse } from "../../core/types/responses/allocate-external-party-response.js";
import { ExternalPartyOnboardingTransaction } from "../../core/types/external-party/external-party-onboarding-transaction.js";
import { ExternalPartySignature } from "../../core/types/external-party/external-party-signature.js";
import { GetParticipantIdRequest } from "../../core/types/requests/get-participant-id-request.js";
import { GetPartiesRequest } from "../../core/types/requests/get-parties-request.js";
import { ListKnownPartiesRequest } from "../../core/types/requests/list-known-parties-request.js";
import { AllocatePartyResponse } from "../../core/types/responses/allocate-party-response.js";
import { GenerateExternalPartyTopologyResponse } from "../../core/types/responses/generate-external-party-topology-response.js";
import { GetParticipantIdResponse } from "../../core/types/responses/get-participant-id-response.js";
import { GetPartiesResponse } from "../../core/types/responses/get-parties-response.js";
import { ListKnownPartiesResponse } from "../../core/types/responses/list-known-parties-response.js";
import { PreparedDecentralizedParty } from "../../core/types/requests/finalize-decentralized-party-request.js";
import { DecentralizedPartyDetachedSignature } from "../../core/types/requests/finalize-decentralized-party-request.js";
import { ValidationError } from "../../core/errors/validation-error.js";
import { TopologyManagerWriteServiceClient } from "../topology-manager-write/topology-manager-write-service-client.js";
import { prepareDecentralizedPartyAsync } from "./decentralized-party-lifecycle.js";
import { NotSupportedError } from "../../core/errors/not-supported-error.js";
import { computeCantonPublicKeyFingerprint } from "../../core/hashing/canton-hash.js";

export class PartyManagementServiceClient {
    public constructor(
        private readonly transport: ITransport,
        private readonly topologyWriter?: TopologyManagerWriteServiceClient,
    ) {
        void this.transport;
    }

    /** Prepares canonical decentralized-party topology for caller-owned signing. Supported on gRPC with participant-admin configuration. */
    public async prepareDecentralizedPartyAsync(
        request: CreateDecentralizedPartyRequest,
        options?: RequestOptions,
    ): Promise<PreparedDecentralizedParty> {
        if (this.topologyWriter === undefined) {
            throw new NotSupportedError("decentralized party preparation requires a topology manager write service");
        }
        const participant = await this.getParticipantIdAsync(
            new GetParticipantIdRequest(),
            options,
        );
        return prepareDecentralizedPartyAsync(
            request,
            participant,
            this.topologyWriter,
            options,
        );
    }

    /** Validates detached decentralized-party signatures before allocation. */
    public async finalizeDecentralizedPartyAsync(
        prepared: PreparedDecentralizedParty,
        signatures: readonly DecentralizedPartyDetachedSignature[],
        _options?: RequestOptions,
    ): Promise<AllocateExternalPartyResponse> {
        if (prepared.signingRequests.length === 0) {
            throw new ValidationError("decentralized party finalization is missing prepared signing requests");
        }
        const expected = new Map(prepared.signingRequests.map((request) => [request.id, request]));
        const seen = new Set<string>();
        const signaturesByHash = new Map<string, ExternalPartySignature[]>();
        for (const detached of signatures) {
            const signingRequest = expected.get(detached.signingRequestId);
            if (signingRequest === undefined || seen.has(detached.signingRequestId)) {
                throw new ValidationError("decentralized party finalization has unexpected or duplicate signatures");
            }
            if (detached.result.signature.length === 0) {
                throw new ValidationError("decentralized party finalization has malformed signatures");
            }
            seen.add(detached.signingRequestId);
            const key = toHex(signingRequest.transactionHash);
            const transactionSignatures = signaturesByHash.get(key) ?? [];
            transactionSignatures.push(new ExternalPartySignature({
                format: detached.result.format,
                signature: detached.result.signature,
                signedByFingerprint: signingRequest.publicKeyFingerprint,
                signingAlgorithmSpec: detached.result.signingAlgorithmSpec,
            }));
            signaturesByHash.set(key, transactionSignatures);
        }
        for (const [index, transaction] of prepared.transactions.entries()) {
            const requests = prepared.signingRequests.filter(
                (request) => toHex(request.transactionHash) === toHex(transaction.transactionHash),
            );
            const ownerRequired = index === 0
                ? requests.filter((request) => request.role === "owner").length
                : prepared.ownerThreshold;
            const ownerProvided = requests.filter(
                (request) => request.role === "owner" && seen.has(request.id),
            ).length;
            const partyRequests = requests.filter((request) => request.role === "partySigningKey");
            const partyProvided = partyRequests.filter((request) => seen.has(request.id)).length;
            if (ownerProvided < ownerRequired || partyProvided < partyRequests.length) {
                throw new ValidationError("decentralized party finalization has missing signatures");
            }
        }
        return this.allocateExternalPartyAsync(new AllocateExternalPartyRequest({
            synchronizer: prepared.synchronizer,
            onboardingTransactions: prepared.transactions.map((transaction) =>
                new ExternalPartyOnboardingTransaction({
                    transaction: transaction.serializedTransaction,
                    signatures: signaturesByHash.get(toHex(transaction.transactionHash)) ?? [],
                }),
            ),
            multiHashSignatures: [],
        }), _options);
    }

    /** Creates a decentralized party using the per-key callbacks in the request. */
    public async createDecentralizedPartyAsync(
        request: CreateDecentralizedPartyRequest,
        options?: RequestOptions,
    ): Promise<AllocateExternalPartyResponse> {
        const prepared = await this.prepareDecentralizedPartyAsync(request, options);
        const keys = [...request.owners, ...request.partySigningKeys];
        const signatures: DecentralizedPartyDetachedSignature[] = [];
        for (const signingRequest of prepared.signingRequests) {
            const key = keys.find((candidate) =>
                computeFingerprint(candidate) === signingRequest.publicKeyFingerprint,
            );
            if (key?.sign === undefined) {
                throw new ValidationError("decentralized party creation requires a signer for every key");
            }
            signatures.push({
                signingRequestId: signingRequest.id,
                result: await key.sign({
                    payload: new Uint8Array(signingRequest.payload),
                    kind: "topology-transaction",
                    partyId: prepared.partyId,
                    publicKeyFingerprint: signingRequest.publicKeyFingerprint,
                    role: signingRequest.role,
                    transactionHash: new Uint8Array(signingRequest.transactionHash),
                }),
            });
        }
        return this.finalizeDecentralizedPartyAsync(prepared, signatures, options);
    }

    /** Lists known parties. Supported on JSON and gRPC. */
    public listKnownPartiesAsync(
        request: ListKnownPartiesRequest,
        options?: RequestOptions,
    ): Promise<ListKnownPartiesResponse> {
        return this.transport.listKnownPartiesAsync(request, options);
    }

    /** Reads the host participant identifier. Supported on gRPC; JSON rejects it. */
    public getParticipantIdAsync(
        request: GetParticipantIdRequest,
        options?: RequestOptions,
    ): Promise<GetParticipantIdResponse> {
        return this.transport.getParticipantIdAsync(request, options);
    }

    /** Reads party details for specific parties. Supported on gRPC; JSON rejects it. */
    public getPartiesAsync(
        request: GetPartiesRequest,
        options?: RequestOptions,
    ): Promise<GetPartiesResponse> {
        return this.transport.getPartiesAsync(request, options);
    }

    /** Allocates a party. Supported on JSON and gRPC. */
    public allocatePartyAsync(
        request: AllocatePartyRequest,
        options?: RequestOptions,
    ): Promise<AllocatePartyResponse> {
        return this.transport.allocatePartyAsync(request, options);
    }

    /** Generates external-party topology through the ledger-admin API. Supported on gRPC; JSON rejects it. */
    public generateExternalPartyTopologyAsync(
        request: GenerateExternalPartyTopologyRequest,
        options?: RequestOptions,
    ): Promise<GenerateExternalPartyTopologyResponse> {
        return this.transport.generateExternalPartyTopologyAsync(
            request,
            options,
        );
    }

    /** Allocates an external party through the ledger-admin API. Supported on gRPC; JSON rejects it. */
    public allocateExternalPartyAsync(
        request: AllocateExternalPartyRequest,
        options?: RequestOptions,
    ): Promise<AllocateExternalPartyResponse> {
        return this.transport.allocateExternalPartyAsync(request, options);
    }

    /** Creates an externally controlled party using caller-provided signing. Supported on gRPC. */
    public async createExternalPartyAsync(
        request: CreateExternalPartyRequest,
        options?: RequestOptions,
    ): Promise<AllocateExternalPartyResponse> {
        const generated = await this.generateExternalPartyTopologyAsync(
            new GenerateExternalPartyTopologyRequest({
                synchronizer: request.synchronizer,
                partyHint: request.partyHint,
                publicKey: request.publicKey,
                localParticipantObservationOnly:
                    request.localParticipantObservationOnly,
                otherConfirmingParticipantUids:
                    [...request.otherConfirmingParticipantUids],
                confirmationThreshold: request.confirmationThreshold,
                observingParticipantUids: [...request.observingParticipantUids],
            }),
            options,
        );

        const onboardingTransactions: ExternalPartyOnboardingTransaction[] = [];

        for (const transaction of generated.topologyTransactions) {
            onboardingTransactions.push(
                new ExternalPartyOnboardingTransaction({
                    transaction,
                    signatures: [
                        await this.signExternalPartyPayloadAsync(
                            request,
                            transaction,
                            "topology-transaction",
                            generated.partyId,
                            generated.publicKeyFingerprint,
                        ),
                    ],
                }),
            );
        }

        const multiHashSignature = await this.signExternalPartyPayloadAsync(
            request,
            generated.multiHash,
            "multi-hash",
            generated.partyId,
            generated.publicKeyFingerprint,
        );

        return this.allocateExternalPartyAsync(
            new AllocateExternalPartyRequest({
                synchronizer: request.synchronizer,
                onboardingTransactions,
                multiHashSignatures: [multiHashSignature],
                identityProviderId: request.identityProviderId,
                waitForAllocation: request.waitForAllocation,
                userId: request.userId,
            }),
            options,
        );
    }

    private async signExternalPartyPayloadAsync(
        request: CreateExternalPartyRequest,
        payload: Uint8Array,
        kind: "topology-transaction" | "multi-hash",
        partyId: string,
        publicKeyFingerprint: string,
    ): Promise<ExternalPartySignature> {
        const result = await request.sign({
            payload: new Uint8Array(payload),
            kind,
            partyId,
            publicKeyFingerprint,
        });

        return new ExternalPartySignature({
            format: result.format,
            signature: result.signature,
            signedByFingerprint: publicKeyFingerprint,
            signingAlgorithmSpec: result.signingAlgorithmSpec,
        });
    }
}

function toHex(bytes: Uint8Array): string {
    return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function computeFingerprint(key: import("../../core/types/requests/create-decentralized-party-request.js").DecentralizedPartyKey): string | undefined {
    return computeCantonPublicKeyFingerprint(key.publicKey.keyData, key.publicKey.format);
}
