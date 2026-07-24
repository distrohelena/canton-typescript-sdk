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
import { TopologyManagerWriteServiceClient } from "../topology-manager-write/topology-manager-write-service-client.js";
import { prepareDecentralizedPartyAsync } from "./decentralized-party-lifecycle.js";
import { NotSupportedError } from "../../core/errors/not-supported-error.js";

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
