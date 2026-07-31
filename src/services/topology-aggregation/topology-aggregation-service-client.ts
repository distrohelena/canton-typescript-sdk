import { ITransport } from "../../core/transports/transport.interface.js";
import { pollUntilAsync } from "../../core/polling/poll-until-async.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { WaitForPartyHostingRequest } from "../../core/types/requests/wait-for-party-hosting-request.js";
import type {
    ListKeyOwnersRequest,
    ListKeyOwnersResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.js";
import {
    ListPartiesRequest as TopologyListPartiesRequest,
    ListPartiesResponse as TopologyListPartiesResponse,
    ListPartiesResponse_Result as TopologyListPartiesResult,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.js";

export class TopologyAggregationServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Lists aggregated party hosting information. Supported on gRPC; JSON rejects it. */
    public listPartiesAsync(
        request: TopologyListPartiesRequest,
        options?: RequestOptions,
    ): Promise<TopologyListPartiesResponse> {
        return this.transport.topologyListPartiesAsync(request, options);
    }

    /** Waits for exact aggregated party hosting information. Supported on gRPC; JSON rejects it. */
    public async waitForPartyHostingAsync(
        request: WaitForPartyHostingRequest,
        options?: RequestOptions,
    ): Promise<TopologyListPartiesResult> {
        const response = await pollUntilAsync({
            timeoutMs: request.timeoutMs,
            pollIntervalMs: request.pollIntervalMs,
            readAsync: () => this.listPartiesAsync(
                TopologyListPartiesRequest.create({
                    limit: 1,
                    synchronizerIds: [request.synchronizerId],
                    filterParty: request.partyId,
                    filterParticipant: request.participantId,
                }),
                options,
            ),
            match: value => findPartyHosting(value.results, request) !== undefined,
            createTimeoutError: lastObserved => new Error(
                `Timed out waiting for party hosting for '${request.partyId}'; expected participant '${request.participantId}' on synchronizer '${request.synchronizerId}'; last observed hosting: ${formatHosting(lastObserved?.results ?? [])}.`,
            ),
        });

        const result = findPartyHosting(response.results, request);

        if (result === undefined) {
            throw new Error("Party hosting wait completed without a matching result.");
        }

        return result;
    }

    /** Lists aggregated key owner information. Supported on gRPC; JSON rejects it. */
    public listKeyOwnersAsync(
        request: ListKeyOwnersRequest,
        options?: RequestOptions,
    ): Promise<ListKeyOwnersResponse> {
        return this.transport.listKeyOwnersAsync(request, options);
    }
}

function findPartyHosting(
    results: readonly TopologyListPartiesResult[],
    request: WaitForPartyHostingRequest,
): TopologyListPartiesResult | undefined {
    return results.find(result =>
        result.party === request.partyId &&
        result.participants.some(participant =>
            participant.participantUid === request.participantId &&
            participant.synchronizers.some(permission =>
                permission.synchronizerId === request.synchronizerId,
            ),
        ),
    );
}

function formatHosting(
    results: readonly TopologyListPartiesResult[],
): string {
    if (results.length === 0) {
        return "none";
    }

    return results.slice(0, 5).map(result => {
        const participants = result.participants.slice(0, 5).flatMap(
            participant => participant.synchronizers.slice(0, 5).map(
                synchronizer =>
                    `${participant.participantUid}@${synchronizer.synchronizerId}`,
            ),
        );

        return `party='${result.party}', participants=[${participants.join(", ")}]`;
    }).join("; ");
}
