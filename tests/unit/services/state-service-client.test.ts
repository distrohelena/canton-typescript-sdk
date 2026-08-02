import { describe, expect, it, vi } from "vitest";
import {
    ActiveContractsTraversalOptions,
    OperationDeadline,
    RequestOptions,
    StateServiceClient,
} from "../../../src";
import {
    GetActiveContractsPageRequest,
    GetActiveContractsPageResponse,
    GetConnectedSynchronizersRequest,
    GetConnectedSynchronizersResponse,
    GetLedgerEndRequest,
    GetLedgerEndResponse,
    GetLatestPrunedOffsetsRequest,
    GetLatestPrunedOffsetsResponse,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";

describe("StateServiceClient read methods", () => {
    it("lazily reads raw active-contract pages with a fresh deadline option", async () => {
        const response = GetActiveContractsPageResponse.create({
            activeContracts: [],
            activeAtOffset: "42",
        });

        const getActiveContractsPageAsync = vi.fn(async () => response);

        const deadline = new OperationDeadline({
            timeoutMs: 100,
            now: vi.fn(() => 1_000),
        });

        const createRequestOptions = vi.spyOn(deadline, "createRequestOptions");

        const options = new ActiveContractsTraversalOptions({
            deadline,
            maxPages: 1,
            maxContracts: 1,
        });

        const request = GetActiveContractsPageRequest.create({
            activeAtOffset: "42",
            eventFormat: { filtersByParty: {} },
            maxPageSize: 10,
        });

        const client = new StateServiceClient({
            features: { supportsCommandSigning: false },
            getActiveContractsPageAsync,
        } as never);

        const pages = client.getActiveContractsPagesAsync(request, options);

        expect(createRequestOptions).not.toHaveBeenCalled();
        expect(getActiveContractsPageAsync).not.toHaveBeenCalled();

        const page = await pages[Symbol.asyncIterator]().next();

        expect(page).toEqual({ done: false, value: response });
        expect(page.value).toBe(response);
        expect(createRequestOptions).toHaveBeenCalledTimes(1);
        expect(getActiveContractsPageAsync).toHaveBeenCalledTimes(1);
        expect(getActiveContractsPageAsync).toHaveBeenCalledWith(
            request,
            createRequestOptions.mock.results[0].value,
        );
        expect(createRequestOptions.mock.results[0].value).toBeInstanceOf(
            RequestOptions,
        );
    });

    it.each([undefined, new Uint8Array()])(
        "stops after a page with a terminal token of %p",
        async nextPageToken => {
            const response = GetActiveContractsPageResponse.create({
                activeContracts: [],
                activeAtOffset: "42",
                nextPageToken,
            });

            const getActiveContractsPageAsync = vi.fn(async () => response);

            const options = new ActiveContractsTraversalOptions({
                deadline: new OperationDeadline({ timeoutMs: 100 }),
                maxPages: 1,
                maxContracts: 1,
            });

            const client = new StateServiceClient({
                features: { supportsCommandSigning: false },
                getActiveContractsPageAsync,
            } as never);

            const iterator = client
                .getActiveContractsPagesAsync(
                    GetActiveContractsPageRequest.create({
                        activeAtOffset: "42",
                        eventFormat: { filtersByParty: {} },
                    }),
                    options,
                )
                [Symbol.asyncIterator]();

            await expect(iterator.next()).resolves.toEqual({
                done: false,
                value: response,
            });
            await expect(iterator.next()).resolves.toEqual({ done: true });
            expect(getActiveContractsPageAsync).toHaveBeenCalledTimes(1);
        },
    );

    it("forwards state read requests through the selected transport", async () => {
        const connectedSynchronizersResponse =
            GetConnectedSynchronizersResponse.create();

        const getConnectedSynchronizersAsync = vi.fn(
            async () => connectedSynchronizersResponse,
        );

        const ledgerEndResponse = GetLedgerEndResponse.create({ offset: 7n });

        const getLedgerEndAsync = vi.fn(async () => ledgerEndResponse);

        const prunedOffsetsResponse = GetLatestPrunedOffsetsResponse.create({
            participantPrunedUpToInclusive: 3n,
        });

        const getLatestPrunedOffsetsAsync = vi.fn(
            async () => prunedOffsetsResponse,
        );

        const transport = {
            features: { supportsCommandSigning: false },
            getConnectedSynchronizersAsync,
            getLedgerEndAsync,
            getLatestPrunedOffsetsAsync,
        };

        const client = new StateServiceClient(transport as never);

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.getConnectedSynchronizersAsync(
                GetConnectedSynchronizersRequest.create(),
                options,
            ),
        ).resolves.toBe(connectedSynchronizersResponse);

        await expect(
            client.getLedgerEndAsync(
                GetLedgerEndRequest.create(),
                options,
            ),
        ).resolves.toBe(ledgerEndResponse);

        await expect(
            client.getLatestPrunedOffsetsAsync(
                GetLatestPrunedOffsetsRequest.create(),
                options,
            ),
        ).resolves.toBe(prunedOffsetsResponse);

        expect(getConnectedSynchronizersAsync).toHaveBeenCalledWith(
            GetConnectedSynchronizersRequest.create(),
            options,
        );
        expect(getLedgerEndAsync).toHaveBeenCalledWith(
            GetLedgerEndRequest.create(),
            options,
        );
        expect(getLatestPrunedOffsetsAsync).toHaveBeenCalledWith(
            GetLatestPrunedOffsetsRequest.create(),
            options,
        );
    });
});
