import { ITransport } from "../../core/transports/transport.interface.js";
import { ActiveContractsTraversalError } from "../../core/errors/active-contracts-traversal-error.js";
import { ValidationError } from "../../core/errors/validation-error.js";
import { ActiveContractsTraversalOptions } from "../../core/types/active-contracts-traversal-options.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GetActiveContractsRequest } from "../../core/types/requests/get-active-contracts-request.js";
import type {
    GetActiveContractsPageRequest,
    GetActiveContractsPageResponse,
    GetConnectedSynchronizersRequest,
    GetConnectedSynchronizersResponse,
    GetLedgerEndRequest,
    GetLedgerEndResponse,
    GetLatestPrunedOffsetsRequest,
    GetLatestPrunedOffsetsResponse,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import { ContractObserver } from "../contracts/contract-observer.interface.js";

export class StateServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads a page of active contracts. Supported on gRPC; JSON rejects it. */
    public getActiveContractsPageAsync(
        request: GetActiveContractsPageRequest,
        options?: RequestOptions,
    ): Promise<GetActiveContractsPageResponse> {
        return this.transport.getActiveContractsPageAsync(request, options);
    }

    /** Reads active-contract pages lazily. Supported on gRPC; JSON rejects it. */
    public getActiveContractsPagesAsync(
        request: GetActiveContractsPageRequest,
        options: ActiveContractsTraversalOptions,
    ): AsyncIterable<GetActiveContractsPageResponse> {
        return this.getActiveContractsPagesLazy(request, options);
    }

    /** Reads active contracts as a stream. JSON-backed; gRPC currently rejects it. */
    public getActiveContractsAsync(
        request: GetActiveContractsRequest,
        observer: ContractObserver,
        options?: RequestOptions,
    ): Promise<void> {
        return this.transport.getActiveContractsAsync(request, observer, options);
    }

    /** Reads connected synchronizers. Supported on gRPC; JSON rejects it. */
    public getConnectedSynchronizersAsync(
        request: GetConnectedSynchronizersRequest,
        options?: RequestOptions,
    ): Promise<GetConnectedSynchronizersResponse> {
        return this.transport.getConnectedSynchronizersAsync(request, options);
    }

    /** Reads the participant ledger end. Supported on gRPC; JSON rejects it. */
    public getLedgerEndAsync(
        request: GetLedgerEndRequest,
        options?: RequestOptions,
    ): Promise<GetLedgerEndResponse> {
        return this.transport.getLedgerEndAsync(request, options);
    }

    /** Reads the latest participant pruning offsets. Supported on gRPC; JSON rejects it. */
    public getLatestPrunedOffsetsAsync(
        request: GetLatestPrunedOffsetsRequest,
        options?: RequestOptions,
    ): Promise<GetLatestPrunedOffsetsResponse> {
        return this.transport.getLatestPrunedOffsetsAsync(request, options);
    }

    private async *getActiveContractsPagesLazy(
        request: GetActiveContractsPageRequest,
        options: ActiveContractsTraversalOptions,
    ): AsyncGenerator<GetActiveContractsPageResponse> {
        if (request.pageToken && request.pageToken.length > 0) {
            throw new ValidationError(
                "active contracts traversal must not start with a page token",
            );
        }

        let pageRequest = request;

        let pagesRead = 0;

        let contractsRead = 0;

        let activeAtOffset: string | undefined;

        const observedPageTokens = new Set<string>();

        while (true) {
            if (pagesRead >= options.maxPages) {
                throw new ActiveContractsTraversalError(
                    "max-pages-exceeded",
                    "active contracts traversal exceeded maxPages",
                );
            }

            const response = await this.transport.getActiveContractsPageAsync(
                pageRequest,
                options.deadline.createRequestOptions(),
            );

            pagesRead += 1;

            if (
                typeof response.activeAtOffset !== "string" ||
                response.activeAtOffset.trim().length === 0
            ) {
                throw new ActiveContractsTraversalError(
                    "missing-active-at-offset",
                    "active contracts response is missing activeAtOffset",
                );
            } else if (activeAtOffset === undefined) {
                if (
                    request.activeAtOffset !== undefined &&
                    request.activeAtOffset !== response.activeAtOffset
                ) {
                    throw new ActiveContractsTraversalError(
                        "active-at-offset-mismatch",
                        "active contracts response activeAtOffset does not match the request",
                    );
                }

                activeAtOffset = response.activeAtOffset;
            } else if (activeAtOffset !== response.activeAtOffset) {
                throw new ActiveContractsTraversalError(
                    "active-at-offset-mismatch",
                    "active contracts response activeAtOffset changed during traversal",
                );
            }

            contractsRead += response.activeContracts.length;

            if (contractsRead > options.maxContracts) {
                throw new ActiveContractsTraversalError(
                    "max-contracts-exceeded",
                    "active contracts traversal exceeded maxContracts",
                );
            }

            yield response;

            if (!response.nextPageToken || response.nextPageToken.length === 0) {
                return;
            }

            const pageTokenKey = Array.from(response.nextPageToken).join(",");

            if (observedPageTokens.has(pageTokenKey)) {
                throw new ActiveContractsTraversalError(
                    "repeated-page-token",
                    "active contracts traversal received a repeated page token",
                );
            }

            observedPageTokens.add(pageTokenKey);

            pageRequest = {
                activeAtOffset,
                eventFormat: request.eventFormat,
                maxPageSize: request.maxPageSize,
                pageToken: response.nextPageToken,
            };
        }
    }
}
