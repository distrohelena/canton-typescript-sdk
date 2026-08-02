import { describe, expect, it, vi } from "vitest";
import {
    ActiveContractsTraversalOptions,
    NotSupportedError,
    OperationDeadline,
    RequestOptions,
    StateServiceClient,
    TimeoutError,
    ValidationError,
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

    describe("active-contract page traversal invariants", () => {
        const request = (init: Partial<GetActiveContractsPageRequest> = {}) =>
            GetActiveContractsPageRequest.create({
                eventFormat: { filtersByParty: {} },
                maxPageSize: 10,
                ...init,
            });

        const response = (init: Partial<GetActiveContractsPageResponse> = {}) =>
            GetActiveContractsPageResponse.create({
                activeContracts: [],
                activeAtOffset: "42",
                ...init,
            });

        const traversalOptions = (init: {
            deadline?: OperationDeadline;
            maxPages?: number;
            maxContracts?: number;
        } = {}) => new ActiveContractsTraversalOptions({
            deadline: init.deadline ?? new OperationDeadline({ timeoutMs: 100 }),
            maxPages: init.maxPages ?? 3,
            maxContracts: init.maxContracts ?? 3,
        });

        const clientFor = (
            getActiveContractsPageAsync: ReturnType<typeof vi.fn>,
        ) => new StateServiceClient({
            features: { supportsCommandSigning: false },
            getActiveContractsPageAsync,
        } as never);

        it("rejects an initial continuation token only when iteration starts", async () => {
            const getActiveContractsPageAsync = vi.fn();

            const pages = clientFor(getActiveContractsPageAsync)
                .getActiveContractsPagesAsync(
                    request({ pageToken: new Uint8Array([1]) }),
                    traversalOptions(),
                );

            expect(getActiveContractsPageAsync).not.toHaveBeenCalled();

            await expect(pages[Symbol.asyncIterator]().next()).rejects.toBeInstanceOf(
                ValidationError,
            );
            expect(getActiveContractsPageAsync).not.toHaveBeenCalled();
        });

        it.each([
            ["explicit", request({ activeAtOffset: "42" }), response({ activeAtOffset: "43" })],
            ["omitted", request(), response({ activeAtOffset: "42", nextPageToken: new Uint8Array([1]) })],
        ] as const)(
            "locks the %s initial snapshot offset from the first response",
            async (_kind, initialRequest, firstResponse) => {
                const getActiveContractsPageAsync = vi.fn()
                    .mockResolvedValueOnce(firstResponse)
                    .mockResolvedValueOnce(response({ activeAtOffset: "42" }));

                const iterator = clientFor(getActiveContractsPageAsync)
                    .getActiveContractsPagesAsync(initialRequest, traversalOptions())
                    [Symbol.asyncIterator]();

                if (initialRequest.activeAtOffset) {
                    await expect(iterator.next()).rejects.toMatchObject({
                        code: "active-at-offset-mismatch",
                    });

                    return;
                }

                await expect(iterator.next()).resolves.toMatchObject({
                    done: false,
                    value: firstResponse,
                });
                await expect(iterator.next()).resolves.toMatchObject({ done: false });
                expect(getActiveContractsPageAsync).toHaveBeenNthCalledWith(
                    2,
                    {
                        activeAtOffset: "42",
                        eventFormat: initialRequest.eventFormat,
                        maxPageSize: initialRequest.maxPageSize,
                        pageToken: firstResponse.nextPageToken,
                    },
                    expect.any(RequestOptions),
                );
            },
        );

        it("continues an explicit matching snapshot offset across distinct pages", async () => {
            const initialRequest = request({ activeAtOffset: "42" });

            const firstPage = response({
                activeAtOffset: "42",
                nextPageToken: new Uint8Array([8]),
            });

            const secondPage = response({ activeAtOffset: "42" });

            const getActiveContractsPageAsync = vi.fn()
                .mockResolvedValueOnce(firstPage)
                .mockResolvedValueOnce(secondPage);

            const iterator = clientFor(getActiveContractsPageAsync)
                .getActiveContractsPagesAsync(initialRequest, traversalOptions())
                [Symbol.asyncIterator]();

            await expect(iterator.next()).resolves.toEqual({
                done: false,
                value: firstPage,
            });
            await expect(iterator.next()).resolves.toEqual({
                done: false,
                value: secondPage,
            });
            expect(getActiveContractsPageAsync).toHaveBeenNthCalledWith(
                2,
                {
                    activeAtOffset: "42",
                    eventFormat: initialRequest.eventFormat,
                    maxPageSize: initialRequest.maxPageSize,
                    pageToken: firstPage.nextPageToken,
                },
                expect.any(RequestOptions),
            );
        });

        it.each([
            ["missing first", [{ activeContracts: [] } as GetActiveContractsPageResponse]],
            ["empty first", [response({ activeAtOffset: "" })]],
            [
                "missing later",
                [
                    response({ nextPageToken: new Uint8Array([1]) }),
                    { activeContracts: [] } as GetActiveContractsPageResponse,
                ],
            ],
            [
                "empty later",
                [
                    response({ nextPageToken: new Uint8Array([1]) }),
                    response({ activeAtOffset: "" }),
                ],
            ],
        ] as const)(
            "rejects a %s activeAtOffset",
            async (_kind, responses) => {
                const getActiveContractsPageAsync = vi.fn();

                for (const page of responses) {
                    getActiveContractsPageAsync.mockResolvedValueOnce(page);
                }

                const iterator = clientFor(getActiveContractsPageAsync)
                    .getActiveContractsPagesAsync(request(), traversalOptions())
                    [Symbol.asyncIterator]();

                if (responses.length > 1) {
                    await expect(iterator.next()).resolves.toMatchObject({ done: false });
                }

                await expect(iterator.next()).rejects.toMatchObject({
                    code: "missing-active-at-offset",
                });
            },
        );

        it("rejects a later response with a changed snapshot offset", async () => {
            const getActiveContractsPageAsync = vi.fn()
                .mockResolvedValueOnce(response({ nextPageToken: new Uint8Array([1]) }))
                .mockResolvedValueOnce(response({ activeAtOffset: "43" }));

            const iterator = clientFor(getActiveContractsPageAsync)
                .getActiveContractsPagesAsync(request(), traversalOptions())
                [Symbol.asyncIterator]();

            await expect(iterator.next()).resolves.toMatchObject({ done: false });
            await expect(iterator.next()).rejects.toMatchObject({
                code: "active-at-offset-mismatch",
            });
        });

        it("rejects byte-identical continuation tokens from distinct Uint8Arrays", async () => {
            const getActiveContractsPageAsync = vi.fn()
                .mockResolvedValueOnce(
                    response({ nextPageToken: new Uint8Array([1, 2]) }),
                )
                .mockResolvedValueOnce(
                    response({ nextPageToken: new Uint8Array([1, 2]) }),
                );

            const iterator = clientFor(getActiveContractsPageAsync)
                .getActiveContractsPagesAsync(request(), traversalOptions())
                [Symbol.asyncIterator]();

            await expect(iterator.next()).resolves.toMatchObject({ done: false });
            await expect(iterator.next()).resolves.toMatchObject({ done: false });
            await expect(iterator.next()).rejects.toMatchObject({
                code: "repeated-page-token",
            });
            expect(getActiveContractsPageAsync).toHaveBeenCalledTimes(2);
        });

        it("stops before dispatching page maxPages plus one", async () => {
            const getActiveContractsPageAsync = vi.fn().mockResolvedValue(
                response({ nextPageToken: new Uint8Array([1]) }),
            );

            const iterator = clientFor(getActiveContractsPageAsync)
                .getActiveContractsPagesAsync(request(), traversalOptions({ maxPages: 1 }))
                [Symbol.asyncIterator]();

            await expect(iterator.next()).resolves.toMatchObject({ done: false });
            await expect(iterator.next()).rejects.toMatchObject({
                code: "max-pages-exceeded",
            });
            expect(getActiveContractsPageAsync).toHaveBeenCalledTimes(1);
        });

        it("rejects a cumulative contract count over the bound before yielding", async () => {
            const getActiveContractsPageAsync = vi.fn().mockResolvedValue(
                response({ activeContracts: [{}, {}] as never }),
            );

            const iterator = clientFor(getActiveContractsPageAsync)
                .getActiveContractsPagesAsync(
                    request(),
                    traversalOptions({ maxContracts: 1 }),
                )
                [Symbol.asyncIterator]();

            await expect(iterator.next()).rejects.toMatchObject({
                code: "max-contracts-exceeded",
            });
        });

        it("creates distinct shrinking deadline options for every dispatched page", async () => {
            let now = 1_000;

            const deadline = new OperationDeadline({
                timeoutMs: 100,
                now: () => now++,
            });

            const getActiveContractsPageAsync = vi.fn()
                .mockResolvedValueOnce(response({ nextPageToken: new Uint8Array([1]) }))
                .mockResolvedValueOnce(response());

            const iterator = clientFor(getActiveContractsPageAsync)
                .getActiveContractsPagesAsync(request(), traversalOptions({ deadline }))
                [Symbol.asyncIterator]();

            await iterator.next();
            await iterator.next();

            const firstOptions = getActiveContractsPageAsync.mock.calls[0]?.[1];

            const secondOptions = getActiveContractsPageAsync.mock.calls[1]?.[1];

            expect(firstOptions).toBeInstanceOf(RequestOptions);
            expect(secondOptions).toBeInstanceOf(RequestOptions);
            expect(firstOptions).not.toBe(secondOptions);
            expect(firstOptions.timeoutMs).toBeGreaterThan(secondOptions.timeoutMs);
        });

        it("does not dispatch page two when for-await stops after page one", async () => {
            const getActiveContractsPageAsync = vi.fn().mockResolvedValue(
                response({ nextPageToken: new Uint8Array([1]) }),
            );

            for await (const page of clientFor(getActiveContractsPageAsync)
                .getActiveContractsPagesAsync(request(), traversalOptions())) {
                expect(page.activeAtOffset).toBe("42");

                break;
            }

            expect(getActiveContractsPageAsync).toHaveBeenCalledTimes(1);
        });

        it.each([
            new NotSupportedError("not supported"),
            new TimeoutError("timed out"),
            new Error("transport failed"),
        ])("preserves the identity of transport error %s", async transportError => {
            const getActiveContractsPageAsync = vi.fn().mockRejectedValue(transportError);

            const iterator = clientFor(getActiveContractsPageAsync)
                .getActiveContractsPagesAsync(request(), traversalOptions())
                [Symbol.asyncIterator]();

            await expect(iterator.next()).rejects.toBe(transportError);
        });

        it("uses only the locked snapshot fields in a continuation request", async () => {
            const firstResponse = response({ nextPageToken: new Uint8Array([8]) });

            const initialRequest = Object.assign(request(), {
                unrelatedInitialToken: new Uint8Array([9]),
            });

            const getActiveContractsPageAsync = vi.fn()
                .mockResolvedValueOnce(firstResponse)
                .mockResolvedValueOnce(response());

            const iterator = clientFor(getActiveContractsPageAsync)
                .getActiveContractsPagesAsync(initialRequest, traversalOptions())
                [Symbol.asyncIterator]();

            await iterator.next();
            await iterator.next();

            expect(getActiveContractsPageAsync).toHaveBeenNthCalledWith(
                2,
                {
                    activeAtOffset: "42",
                    eventFormat: initialRequest.eventFormat,
                    maxPageSize: initialRequest.maxPageSize,
                    pageToken: firstResponse.nextPageToken,
                },
                expect.any(RequestOptions),
            );
        });
    });

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
