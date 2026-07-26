import { RequestOptions } from "../core/types/request-options.js";
import { AuthorizeTopologyTransactionsRequest } from "../core/types/requests/authorize-topology-transactions-request.js";
import { TopologyStoreId, TopologyStoreKind, TopologyStoreSynchronizer } from "../core/types/topology/topology-store-id.js";
import type {
    BaseQuery,
    BaseResult,
    ListPartyToParticipantRequest,
} from "../transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.js";
import type { PartyToParticipant } from "../transports/grpc/generated/canton/com/digitalasset/canton/protocol/v30/topology.js";
import { Enums_TopologyChangeOp } from "../transports/grpc/generated/canton/com/digitalasset/canton/protocol/v30/topology.js";
import { CantonClient } from "./canton-client.js";
import { ExternalPartyActivationRequest } from "./external-party-activation-request.js";
import { ExternalPartyActivationResponse } from "./external-party-activation-response.js";

interface PartyToParticipantReadState {
    readonly active?: {
        readonly context: BaseResult;
        readonly mapping: PartyToParticipant;
    };
    readonly proposal?: {
        readonly context: BaseResult;
        readonly mapping: PartyToParticipant;
    };
}

/** Coordinates multi-host external-party activation across participant-admin topology reads and writes. gRPC only. */
export class ExternalPartyActivationClient {
    public constructor(private readonly sourceClient: CantonClient) {}

    /** Waits for a PartyToParticipant proposal, asks additional participants to co-authorize it, and waits for activation. gRPC only. */
    public async activateAsync(
        request: ExternalPartyActivationRequest,
        options?: RequestOptions,
    ): Promise<ExternalPartyActivationResponse> {
        if (request.activationTimeoutMs <= 0) {
            throw new Error(
                `External party activation timeout must be greater than zero, received ${request.activationTimeoutMs}.`,
            );
        }

        if (request.pollIntervalMs < 0) {
            throw new Error(
                `External party activation poll interval must be zero or greater, received ${request.pollIntervalMs}.`,
            );
        }

        const initialState = await this.waitForProposalOrActivationAsync(
            request,
            options,
        );

        if (initialState.active !== undefined) {
            return this.createActivationResponse(
                request,
                initialState.active.context,
                initialState.active.mapping,
            );
        }

        if (initialState.proposal === undefined) {
            throw new Error(
                `External party activation did not find an active or proposed PartyToParticipant mapping for '${request.partyId}'.`,
            );
        }

        const transactionHash = convertBytesToHex(
            initialState.proposal.context.transactionHash,
        );

        if (transactionHash.length === 0) {
            throw new Error(
                `External party activation could not read a transaction hash for '${request.partyId}'.`,
            );
        }

        const authorizeRequest = new AuthorizeTopologyTransactionsRequest({
            transactionHash,
            mustFullyAuthorize: false,
            store: createSynchronizerStoreId(request.synchronizerId),
        });

        for (const client of request.authorizingClients) {
            await client.topologyManagerWriteService.authorizeAsync(
                authorizeRequest,
                options,
            );
        }

        const activatedState = await this.waitForActivationAsync(request, options);

        return this.createActivationResponse(
            request,
            activatedState.context,
            activatedState.mapping,
        );
    }

    private async waitForProposalOrActivationAsync(
        request: ExternalPartyActivationRequest,
        options?: RequestOptions,
    ): Promise<PartyToParticipantReadState> {
        const startedAt = Date.now();

        while (Date.now() - startedAt <= request.activationTimeoutMs) {
            const state = await this.readStateAsync(request, options);

            if (state.active !== undefined || state.proposal !== undefined) {
                return state;
            }

            await delayAsync(request.pollIntervalMs);
        }

        throw new Error(
            `External party activation timed out while waiting for a PartyToParticipant proposal for '${request.partyId}' on synchronizer '${request.synchronizerId}'.`,
        );
    }

    private async waitForActivationAsync(
        request: ExternalPartyActivationRequest,
        options?: RequestOptions,
    ): Promise<{
        readonly context: BaseResult;
        readonly mapping: PartyToParticipant;
    }> {
        const startedAt = Date.now();

        while (Date.now() - startedAt <= request.activationTimeoutMs) {
            const state = await this.readStateAsync(request, options);

            if (state.active !== undefined) {
                return state.active;
            }

            await delayAsync(request.pollIntervalMs);
        }

        throw new Error(
            `External party activation timed out while waiting for '${request.partyId}' to become active on synchronizer '${request.synchronizerId}'.`,
        );
    }

    private async readStateAsync(
        request: ExternalPartyActivationRequest,
        options?: RequestOptions,
    ): Promise<PartyToParticipantReadState> {
        const [activeResponse, proposalResponse] = await Promise.all([
            this.sourceClient.topologyManagerReadService.listPartyToParticipantAsync(
                {
                    baseQuery: createSynchronizerQuery(
                        request.synchronizerId,
                        false,
                    ),
                    filterParty: request.partyId,
                    filterParticipant: "",
                } satisfies ListPartyToParticipantRequest,
                options,
            ),
            this.sourceClient.topologyManagerReadService.listPartyToParticipantAsync(
                {
                    baseQuery: createSynchronizerQuery(
                        request.synchronizerId,
                        true,
                    ),
                    filterParty: request.partyId,
                    filterParticipant: "",
                } satisfies ListPartyToParticipantRequest,
                options,
            ),
        ]);

        const active = activeResponse.results.find(
            (item) => item.item?.party === request.partyId,
        );
        const proposal = proposalResponse.results.find(
            (item) => item.item?.party === request.partyId,
        );

        return {
            active:
                active === undefined || active.context === undefined || active.item === undefined
                    ? undefined
                    : {
                          context: active.context,
                          mapping: active.item,
                      },
            proposal:
                proposal === undefined || proposal.context === undefined || proposal.item === undefined
                    ? undefined
                    : {
                          context: proposal.context,
                          mapping: proposal.item,
                      },
        };
    }

    private createActivationResponse(
        request: ExternalPartyActivationRequest,
        context: BaseResult,
        mapping: PartyToParticipant,
    ): ExternalPartyActivationResponse {
        return new ExternalPartyActivationResponse({
            partyId: request.partyId,
            synchronizerId: request.synchronizerId,
            transactionHash: convertBytesToHex(context.transactionHash),
            mapping,
        });
    }
}

function createSynchronizerStoreId(synchronizerId: string): TopologyStoreId {
    return new TopologyStoreId({
        kind: TopologyStoreKind.synchronizer,
        synchronizer: new TopologyStoreSynchronizer({
            id: synchronizerId,
        }),
    });
}

function createSynchronizerQuery(
    synchronizerId: string,
    includeProposals: boolean,
): BaseQuery {
    return {
        store: {
            store: {
                oneofKind: "synchronizer",
                synchronizer: {
                    kind: {
                        oneofKind: "id",
                        id: synchronizerId,
                    },
                },
            },
        },
        proposals: includeProposals,
        operation: Enums_TopologyChangeOp.UNSPECIFIED,
        timeQuery: { oneofKind: "headState", headState: {} },
        filterSignedKey: "",
    };
}

function convertBytesToHex(value: Uint8Array): string {
    return Array.from(value, (item) => item.toString(16).padStart(2, "0")).join(
        "",
    );
}

async function delayAsync(durationMs: number): Promise<void> {
    if (durationMs <= 0) {
        return;
    }

    await new Promise((resolve) => {
        setTimeout(resolve, durationMs);
    });
}
