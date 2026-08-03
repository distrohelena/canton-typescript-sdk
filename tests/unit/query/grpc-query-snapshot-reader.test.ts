import { describe, expect, it, vi } from "vitest";
import { GrpcTransportError } from "../../../src/core/errors/grpc-transport-error.js";
import { GrpcQuerySnapshotReader } from "../../../src/query/grpc/grpc-query-snapshot-reader.js";
import {
    GetActiveContractsPageResponse,
    GetActiveContractsResponse,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import {
    GetUpdateResponse,
    GetUpdatesPageResponse,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js";
import { TransactionShape } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/transaction_filter.js";

describe("gRPC query snapshot reader", () => {
    const transactionUpdate = (offset: string) => GetUpdateResponse.create({
        update: { oneofKind: "transaction", transaction: { offset } },
    });

    const expectImmutableBytes = (bytes: Uint8Array, expected: readonly number[]) => {
        expect(() => bytes[0] = 9).toThrow();
        expect(() => bytes.set([9])).toThrow();
        expect(() => bytes.fill(9)).toThrow();
        expect(() => bytes.subarray(0)[0] = 9).toThrow();

        new Uint8Array(bytes.buffer)[0] = 9;

        expect([...bytes]).toEqual(expected);
        expect([...bytes]).toEqual(expected);
    };

    const historyPage = (init: Partial<GetUpdatesPageResponse> = {}) =>
        GetUpdatesPageResponse.create({
            updates: [],
            lowestPageOffsetExclusive: "0",
            highestPageOffsetInclusive: "42",
            ...init,
        });

    const activePage = (init: Partial<GetActiveContractsPageResponse> = {}) =>
        GetActiveContractsPageResponse.create({
            activeContracts: [],
            activeAtOffset: "42",
            ...init,
        });

    const readerFor = (init: {
        ledgerEnd?: string;
        prunedUpTo?: string;
        historyPages?: readonly GetUpdatesPageResponse[];
        activePages?: readonly GetActiveContractsPageResponse[];
        options?: ConstructorParameters<typeof GrpcQuerySnapshotReader>[2];
    } = {}) => {
        const getLedgerEndAsync = vi.fn().mockResolvedValue({
            offset: init.ledgerEnd ?? "42",
        });

        const getLatestPrunedOffsetsAsync = vi.fn().mockResolvedValue({
            participantPrunedUpToInclusive: init.prunedUpTo ?? "0",
        });

        const getUpdatesPageAsync = vi.fn();

        const getActiveContractsPageAsync = vi.fn();

        for (const page of init.historyPages ?? [historyPage()]) {
            getUpdatesPageAsync.mockResolvedValueOnce(page);
        }

        for (const page of init.activePages ?? [activePage()]) {
            getActiveContractsPageAsync.mockResolvedValueOnce(page);
        }

        return {
            reader: new GrpcQuerySnapshotReader(
                { getLedgerEndAsync, getLatestPrunedOffsetsAsync, getActiveContractsPageAsync } as never,
                { getUpdatesPageAsync } as never,
                init.options,
            ),
            getLedgerEndAsync,
            getLatestPrunedOffsetsAsync,
            getUpdatesPageAsync,
            getActiveContractsPageAsync,
        };
    };

    it("binds current history to one ledger-end read and traverses that exact range", async () => {
        const { reader, getLedgerEndAsync, getLatestPrunedOffsetsAsync, getUpdatesPageAsync } = readerFor();

        await expect(reader.readCurrentHistoryAsync()).resolves.toMatchObject({
            endInclusive: "42",
            updates: [],
        });

        expect(getLedgerEndAsync).toHaveBeenCalledTimes(1);
        expect(getLedgerEndAsync).toHaveBeenCalledWith({});
        expect(getLatestPrunedOffsetsAsync).toHaveBeenCalledWith({});
        expect(getUpdatesPageAsync).toHaveBeenCalledWith(expect.objectContaining({
            beginOffsetExclusive: "0",
            endOffsetInclusive: "42",
            descendingOrder: false,
            updateFormat: {
                includeTransactions: {
                    eventFormat: {
                        filtersByParty: {},
                        filtersForAnyParty: {
                            cumulative: [
                                { identifierFilter: { oneofKind: "wildcardFilter", wildcardFilter: { includeCreatedEventBlob: false } } },
                            ],
                        },
                        verbose: true,
                    },
                    transactionShape: TransactionShape.LEDGER_EFFECTS,
                },
            },
        }));
    });

    it("fails before reading history when the participant has pruned any prefix", async () => {
        const { reader, getUpdatesPageAsync } = readerFor({ prunedUpTo: "1" });

        await expect(reader.readHistoryAsync("42")).rejects.toMatchObject({
            name: "QuerySnapshotIncompleteError",
            beginExclusive: "0",
            endInclusive: "42",
        });
        expect(getUpdatesPageAsync).not.toHaveBeenCalled();
    });

    it("preserves every history request field across continuations", async () => {
        const token = new Uint8Array([9, 8]);

        const { reader, getUpdatesPageAsync } = readerFor({
            historyPages: [
                historyPage({ highestPageOffsetInclusive: "21", nextPageToken: token }),
                historyPage({ lowestPageOffsetExclusive: "21" }),
            ],
        });

        await expect(reader.readHistoryAsync("42")).resolves.toMatchObject({ endInclusive: "42" });

        const [first] = getUpdatesPageAsync.mock.calls[0]!;

        const [second] = getUpdatesPageAsync.mock.calls[1]!;

        expect(first).toEqual({ ...second, pageToken: undefined });
        expect(second.pageToken).toEqual(token);
        expect(second.pageToken).not.toBe(token);
    });

    it("keeps history request format semantics after a consumer attempts to mutate the first request", async () => {
        const getUpdatesPageAsync = vi.fn()
            .mockImplementationOnce(async request => {
                try {
                    request.updateFormat!.includeTransactions!.eventFormat!.verbose = false;
                } catch {}

                return historyPage({ highestPageOffsetInclusive: "21", nextPageToken: new Uint8Array([1]) });
            })
            .mockResolvedValueOnce(historyPage({ lowestPageOffsetExclusive: "21" }));

        const reader = new GrpcQuerySnapshotReader(
            {
                getLedgerEndAsync: vi.fn(),
                getLatestPrunedOffsetsAsync: vi.fn().mockResolvedValue({ participantPrunedUpToInclusive: "0" }),
                getActiveContractsPageAsync: vi.fn(),
            } as never,
            { getUpdatesPageAsync } as never,
        );

        await expect(reader.readHistoryAsync("42")).resolves.toMatchObject({ endInclusive: "42" });
        expect(getUpdatesPageAsync.mock.calls[1]![0].updateFormat).toMatchObject({
            includeTransactions: { eventFormat: { verbose: true }, transactionShape: TransactionShape.LEDGER_EFFECTS },
        });
    });

    it.each([
        ["a repeated continuation token", [
            historyPage({ highestPageOffsetInclusive: "21", nextPageToken: new Uint8Array([1]) }),
            historyPage({ lowestPageOffsetExclusive: "21", highestPageOffsetInclusive: "30", nextPageToken: new Uint8Array([1]) }),
        ]],
        ["a skipped page boundary", [
            historyPage({ highestPageOffsetInclusive: "21", nextPageToken: new Uint8Array([1]) }),
            historyPage({ lowestPageOffsetExclusive: "22" }),
        ]],
        ["a nonterminal empty token", [historyPage({ highestPageOffsetInclusive: "21" })]],
        ["a terminal response that exceeds the requested end", [historyPage({ highestPageOffsetInclusive: "43" })]],
        ["a malformed page boundary", [historyPage({ lowestPageOffsetExclusive: "not-an-offset" })]],
    ] as const)("rejects %s without returning a partial history snapshot", async (_kind, pages) => {
        const { reader } = readerFor({ historyPages: pages });

        await expect(reader.readHistoryAsync("42")).rejects.toMatchObject({
            name: "QuerySnapshotIncompleteError",
            beginExclusive: "0",
            endInclusive: "42",
        });
    });

    it("rejects a tokenized history page that does not advance its boundary", async () => {
        const { reader, getUpdatesPageAsync } = readerFor({
            historyPages: [
                historyPage({
                    lowestPageOffsetExclusive: "0",
                    highestPageOffsetInclusive: "0",
                    nextPageToken: new Uint8Array([1]),
                }),
                historyPage({
                    lowestPageOffsetExclusive: "0",
                    highestPageOffsetInclusive: "42",
                }),
            ],
        });

        await expect(reader.readHistoryAsync("42")).rejects.toMatchObject({
            name: "QuerySnapshotIncompleteError",
            reason: "page-boundary-mismatch",
        });
        expect(getUpdatesPageAsync).toHaveBeenCalledOnce();
    });

    it("accepts an empty terminal history range at the ledger begin", async () => {
        const { reader } = readerFor({
            historyPages: [historyPage({
                lowestPageOffsetExclusive: "0",
                highestPageOffsetInclusive: "0",
            })],
        });

        await expect(reader.readHistoryAsync("0")).resolves.toMatchObject({
            endInclusive: "0",
            updates: [],
        });
    });

    it.each([
        ["outside the upper boundary", transactionUpdate("99")],
        ["at the exclusive lower boundary", transactionUpdate("0")],
        ["a malformed offset", transactionUpdate("01")],
        ["an undefined update oneof", GetUpdateResponse.create()],
    ])("rejects an update %s", async (_kind, update) => {
        const { reader } = readerFor({ historyPages: [historyPage({ updates: [update] })] });

        await expect(reader.readHistoryAsync("42")).rejects.toMatchObject({ name: "QuerySnapshotIncompleteError" });
    });

    it.each([
        ["duplicate", [transactionUpdate("1"), transactionUpdate("1")]],
        ["out-of-order", [transactionUpdate("2"), transactionUpdate("1")]],
    ])("rejects %s update offsets", async (_kind, updates) => {
        const { reader } = readerFor({ historyPages: [historyPage({ updates })] });

        await expect(reader.readHistoryAsync("42")).rejects.toMatchObject({ name: "QuerySnapshotIncompleteError" });
    });

    it("accepts strictly ascending update offsets at page boundaries", async () => {
        const { reader } = readerFor({ historyPages: [historyPage({ updates: [transactionUpdate("1"), transactionUpdate("42")] })] });

        await expect(reader.readHistoryAsync("42")).resolves.toMatchObject({ updates: [expect.anything(), expect.anything()] });
    });

    it.each([
        ["pages", { maxHistoryPages: 1 }, [historyPage({ highestPageOffsetInclusive: "21", nextPageToken: new Uint8Array([1]) })]],
        ["updates", { maxHistoryUpdates: 1 }, [historyPage({ updates: [GetUpdateResponse.create(), GetUpdateResponse.create()] })]],
    ] as const)("rejects configured history %s limits", async (_kind, options, pages) => {
        const { reader } = readerFor({ options, historyPages: pages });

        await expect(reader.readHistoryAsync("42")).rejects.toMatchObject({ name: "QuerySnapshotIncompleteError" });
    });

    it("rejects an oversized history page before serializing its updates", async () => {
        const toBinary = vi.spyOn(GetUpdateResponse, "toBinary").mockImplementation(() => {
            throw new Error("must not serialize");
        });

        const { reader } = readerFor({
            options: { maxHistoryUpdates: 1 },
            historyPages: [historyPage({ updates: [transactionUpdate("1"), transactionUpdate("2")] })],
        });

        try {
            await expect(reader.readHistoryAsync("42")).rejects.toMatchObject({ reason: "max-updates-exceeded" });
            expect(toBinary).not.toHaveBeenCalled();
        } finally {
            toBinary.mockRestore();
        }
    });

    it("returns a detached frozen history snapshot", async () => {
        const sourceHash = new Uint8Array([1, 2]);

        const page = historyPage({
            updates: [GetUpdateResponse.create({
                update: {
                    oneofKind: "transaction",
                    transaction: { offset: "1", externalTransactionHash: sourceHash },
                },
            })],
        });

        const { reader } = readerFor({ historyPages: [page] });

        const snapshot = await reader.readHistoryAsync("42");

        page.updates.length = 0;
        sourceHash[0] = 9;

        expect(snapshot.updates).toHaveLength(1);

        const snapshotHash =
            snapshot.updates[0]!.update.oneofKind === "transaction"
                ? snapshot.updates[0]!.update.transaction.externalTransactionHash
                : undefined;

        expect(snapshotHash).toBeInstanceOf(Uint8Array);
        expectImmutableBytes(snapshotHash!, [1, 2]);
        expect(GetUpdateResponse.toBinary(snapshot.updates[0]!)).toBeInstanceOf(Uint8Array);
        expect(Object.isFrozen(snapshot)).toBe(true);
        expect(Object.isFrozen(snapshot.updates)).toBe(true);
    });

    it("preserves an underlying gRPC transport error unchanged", async () => {
        const transportError = GrpcTransportError.fromUnknown(Object.assign(new Error("unavailable"), {
            name: "RpcError",
            code: "UNAVAILABLE",
        }))!;

        const { reader, getUpdatesPageAsync } = readerFor();

        getUpdatesPageAsync.mockReset().mockRejectedValueOnce(transportError);

        await expect(reader.readHistoryAsync("42")).rejects.toBe(transportError);
    });

    it("locks active-contract pages to one offset and preserves the event format on continuation", async () => {
        const token = new Uint8Array([7]);

        const { reader, getActiveContractsPageAsync } = readerFor({
            activePages: [
                activePage({
                    activeContracts: [GetActiveContractsResponse.create()],
                    nextPageToken: token,
                }),
                activePage(),
            ],
        });

        await expect(reader.readActiveContractsAsync("42")).resolves.toMatchObject({ activeAtOffset: "42" });

        const [first] = getActiveContractsPageAsync.mock.calls[0]!;

        const [second] = getActiveContractsPageAsync.mock.calls[1]!;

        expect(first).toEqual({ ...second, pageToken: undefined });
        expect(second.activeAtOffset).toBe("42");
        expect(second.pageToken).toEqual(token);
        expect(second.pageToken).not.toBe(token);
        expect(first.eventFormat).toMatchObject({
            filtersByParty: {},
            filtersForAnyParty: {
                cumulative: [
                    { identifierFilter: { oneofKind: "wildcardFilter", wildcardFilter: { includeCreatedEventBlob: false } } },
                ],
            },
            verbose: true,
        });
    });

    it("uses explicit party filters for a scoped ACS snapshot", async () => {
        const { reader, getActiveContractsPageAsync } = readerFor();

        await reader.readActiveContractsAsync("42", ["Alice", "Bob"]);

        expect(getActiveContractsPageAsync.mock.calls[0]![0].eventFormat).toMatchObject({
            filtersByParty: { Alice: expect.anything(), Bob: expect.anything() },
            verbose: true,
        });
    });

    it("keeps ACS event format semantics after a consumer attempts to mutate the first request", async () => {
        const getActiveContractsPageAsync = vi.fn()
            .mockImplementationOnce(async request => {
                try {
                    request.eventFormat!.verbose = false;
                } catch {}

                return activePage({ activeContracts: [GetActiveContractsResponse.create()], nextPageToken: new Uint8Array([1]) });
            })
            .mockResolvedValueOnce(activePage());

        const reader = new GrpcQuerySnapshotReader(
            {
                getLedgerEndAsync: vi.fn(),
                getLatestPrunedOffsetsAsync: vi.fn(),
                getActiveContractsPageAsync,
            } as never,
            { getUpdatesPageAsync: vi.fn() } as never,
        );

        await reader.readActiveContractsAsync("42");
        expect(getActiveContractsPageAsync.mock.calls[1]![0].eventFormat).toMatchObject({ verbose: true });
    });

    it("returns a detached frozen active-contract snapshot", async () => {
        const sourceBlob = new Uint8Array([3, 4]);

        const activeContract = GetActiveContractsResponse.create({
            workflowId: "original",
            contractEntry: {
                oneofKind: "activeContract",
                activeContract: {
                    createdEvent: { createdEventBlob: sourceBlob },
                },
            },
        });

        const { reader } = readerFor({
            activePages: [activePage({ activeContracts: [activeContract] })],
        });

        const snapshot = await reader.readActiveContractsAsync("42");

        activeContract.workflowId = "changed";
        sourceBlob[0] = 9;

        expect(snapshot.activeContracts).toHaveLength(1);
        expect(snapshot.activeContracts[0]!.workflowId).toBe("original");

        const snapshotBlob = snapshot.activeContracts[0]!.contractEntry.oneofKind === "activeContract"
            ? snapshot.activeContracts[0]!.contractEntry.activeContract.createdEvent?.createdEventBlob
            : undefined;

        expect(snapshotBlob).toBeInstanceOf(Uint8Array);
        expectImmutableBytes(snapshotBlob!, [3, 4]);
        expect(GetActiveContractsResponse.toBinary(snapshot.activeContracts[0]!)).toBeInstanceOf(Uint8Array);
        expect(Object.isFrozen(snapshot)).toBe(true);
        expect(Object.isFrozen(snapshot.activeContracts)).toBe(true);
    });

    it.each([
        ["a changed snapshot offset", [
            activePage({
                activeContracts: [GetActiveContractsResponse.create()],
                nextPageToken: new Uint8Array([1]),
            }),
            activePage({ activeAtOffset: "43" }),
        ]],
        ["a repeated continuation token", [
            activePage({
                activeContracts: [GetActiveContractsResponse.create()],
                nextPageToken: new Uint8Array([1]),
            }),
            activePage({
                activeContracts: [GetActiveContractsResponse.create()],
                nextPageToken: new Uint8Array([1]),
            }),
        ]],
        ["an active-contract response limit", [activePage({ activeContracts: [GetActiveContractsResponse.create(), GetActiveContractsResponse.create()] })]],
        ["an active-contract page limit", [activePage({ activeContracts: [GetActiveContractsResponse.create()], nextPageToken: new Uint8Array([1]) })]],
    ] as const)("rejects %s without returning a partial active-contract snapshot", async (_kind, activePages) => {
        const options = _kind === "an active-contract response limit"
            ? { maxActiveContracts: 1 }
            : _kind === "an active-contract page limit" ? { maxActiveContractPages: 1 } : undefined;

        const { reader } = readerFor({ activePages, options });

        await expect(reader.readActiveContractsAsync("42")).rejects.toMatchObject({ name: "QuerySnapshotIncompleteError" });
    });

    it("rejects an oversized ACS page before serializing its contracts", async () => {
        const toBinary = vi.spyOn(GetActiveContractsResponse, "toBinary").mockImplementation(() => {
            throw new Error("must not serialize");
        });

        const { reader } = readerFor({
            options: { maxActiveContracts: 1 },
            activePages: [activePage({ activeContracts: [GetActiveContractsResponse.create(), GetActiveContractsResponse.create()] })],
        });

        try {
            await expect(reader.readActiveContractsAsync("42")).rejects.toMatchObject({ reason: "max-active-contracts-exceeded" });
            expect(toBinary).not.toHaveBeenCalled();
        } finally {
            toBinary.mockRestore();
        }
    });

    it.each(["00", "01", "+1", "-1", " 1", "", "9223372036854775808"])("rejects non-canonical signed-int64 offsets: %s", async offset => {
        const { reader } = readerFor({ prunedUpTo: offset });

        await expect(reader.readHistoryAsync(offset)).rejects.toMatchObject({
            name: "QuerySnapshotIncompleteError",
            endInclusive: offset,
        });
        await expect(reader.readActiveContractsAsync(offset)).rejects.toMatchObject({ name: "QuerySnapshotIncompleteError" });
    });

    it.each(["00", "01", "+1", "-1", " 1", "", "9223372036854775808"])("treats non-canonical pruning, page, and ACS response offsets as incomplete: %s", async offset => {
        const pruned = readerFor({ prunedUpTo: offset });

        await expect(pruned.reader.readHistoryAsync("42")).rejects.toMatchObject({ reason: "participant-pruned" });
        expect(pruned.getUpdatesPageAsync).not.toHaveBeenCalled();

        const page = readerFor({ historyPages: [historyPage({ lowestPageOffsetExclusive: offset })] });

        await expect(page.reader.readHistoryAsync("42")).rejects.toMatchObject({ name: "QuerySnapshotIncompleteError" });

        const acs = readerFor({ activePages: [activePage({ activeAtOffset: offset })] });

        await expect(acs.reader.readActiveContractsAsync("42")).rejects.toMatchObject({ name: "QuerySnapshotIncompleteError" });
    });

    it.each(["ledger end", "pruning", "ACS"] as const)("preserves %s gRPC errors", async kind => {
        const transportError = GrpcTransportError.fromUnknown(Object.assign(new Error("unavailable"), { name: "RpcError", code: "UNAVAILABLE" }))!;

        const fake = readerFor();

        if (kind === "ledger end") {
            fake.getLedgerEndAsync.mockRejectedValueOnce(transportError);
        }

        if (kind === "pruning") {
            fake.getLatestPrunedOffsetsAsync.mockRejectedValueOnce(transportError);
        }

        if (kind === "ACS") {
            fake.getActiveContractsPageAsync.mockReset().mockRejectedValueOnce(transportError);
        }

        const operation = kind === "ledger end" ? fake.reader.readCurrentHistoryAsync() : kind === "pruning" ? fake.reader.readHistoryAsync("42") : fake.reader.readActiveContractsAsync("42");

        await expect(operation).rejects.toBe(transportError);
    });

    it.each([0, -1, 1.5, Number.POSITIVE_INFINITY])("rejects an invalid traversal limit of %p", value => {
        expect(() => readerFor({ options: { maxHistoryPages: value } })).toThrow();
    });
});
