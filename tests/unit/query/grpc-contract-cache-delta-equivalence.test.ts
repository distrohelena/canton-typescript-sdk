import { describe, expect, it, vi } from "vitest";
import * as fc from "fast-check";
import { propertyParameters } from "../../property/property-test-options.js";
import { GrpcContractCache } from "../../../src/query/grpc/grpc-contract-cache.js";
import { MemoryQueryCache } from "../../../src/query/cache/memory-query-cache.js";
import { CreatedEvent } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/event.js";
import { GetActiveContractsResponse } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import { Value } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/value.js";

/**
 * PROOF OBLIGATION for the beta delta refresh: for ANY operation history, ANY split points
 * O1 <= O2 <= O3, ANY party scope, and ANY page chunking, patching the snapshot taken at O1 forward
 * through the update windows (O1, O2] and then (O2, O3] must produce EXACTLY the snapshot a full ACS
 * download at O3 would produce — same rows, same creation metadata, same offset. The chained second
 * window additionally proves patches compound without drift. fast-check shrinks any violation to a
 * minimal counterexample; FUZZ_SEED/FUZZ_PATH reproduce it.
 */

const PARTIES = ["Alice", "Bob", "Carol"] as const;

const PACKAGES = [
    { packageId: "pkg-app-1", packageName: "app" },
    { packageId: "pkg-app-2", packageName: "app" },
    { packageId: "pkg-other", packageName: "other" },
] as const;

const ENTITIES = ["Asset", "Note"] as const;

interface ModelCreate {
    readonly kind: "create";
    readonly witnessMask: number;
    readonly packageIndex: number;
    readonly representativeIndex: number;
    readonly entityIndex: number;
    readonly ownerIndex: number;
}

interface ModelArchive {
    readonly kind: "archive";
    readonly pick: number;
}

type ModelOp = ModelCreate | ModelArchive;

interface LedgerEvent {
    readonly offset: string;
    readonly contractId: string;
    readonly witnesses: readonly string[];
    readonly kind: "create" | "archive";
    readonly created?: CreatedEvent;
}

/** Replays the abstract ops into a concrete event history; archives resolve against then-live contracts. */
function materializeHistory(ops: readonly ModelOp[]): readonly LedgerEvent[] {
    const events: LedgerEvent[] = [];

    const live = new Map<string, { readonly witnesses: readonly string[]; readonly created: CreatedEvent }>();

    let sequence = 0;

    for (const [index, op] of ops.entries()) {
        const offset = String(index + 1);

        if (op.kind === "create") {
            const witnesses = PARTIES.filter((_, bit) => (op.witnessMask & (1 << bit)) !== 0);

            if (witnesses.length === 0) {
                continue;
            }

            sequence += 1;

            const contractId = `C${sequence}`;

            const pkg = PACKAGES[op.packageIndex % PACKAGES.length]!;

            const representative = PACKAGES.filter((candidate) => candidate.packageName === pkg.packageName)[op.representativeIndex % 2];

            const created = CreatedEvent.create({
                offset,
                nodeId: 1,
                contractId,
                templateId: { packageId: pkg.packageId, moduleName: "Main", entityName: ENTITIES[op.entityIndex % ENTITIES.length]! },
                packageName: pkg.packageName,
                representativePackageId: (representative ?? pkg).packageId,
                witnessParties: [...witnesses],
                signatories: [witnesses[0]!],
                createdAt: { seconds: "1700000000", nanos: 0 },
                createArguments: { fields: [{ label: "owner", value: Value.create({ sum: { oneofKind: "party", party: PARTIES[op.ownerIndex % PARTIES.length]! } }) }] },
            });

            live.set(contractId, { witnesses, created });
            events.push({ offset, contractId, witnesses, kind: "create", created });
        } else if (live.size > 0) {
            const contractId = [...live.keys()][op.pick % live.size]!;

            const { witnesses } = live.get(contractId)!;

            live.delete(contractId);
            events.push({ offset, contractId, witnesses, kind: "archive" });
        }
    }

    return events;
}

function visible(witnesses: readonly string[], scope: readonly string[] | undefined): boolean {
    return scope === undefined || witnesses.some((witness) => scope.includes(witness));
}

/** The ground-truth ACS at an offset for a scope, as the participant would serve it. */
function acsAt(events: readonly LedgerEvent[], offset: number, scope: readonly string[] | undefined): readonly GetActiveContractsResponse[] {
    const activeById = new Map<string, LedgerEvent>();

    for (const event of events) {
        if (BigInt(event.offset) > BigInt(offset)) {
            break;
        }

        if (event.kind === "create") {
            activeById.set(event.contractId, event);
        } else {
            activeById.delete(event.contractId);
        }
    }

    return [...activeById.values()]
        .filter((event) => visible(event.witnesses, scope))
        .map((event) => ({
            contractEntry: { oneofKind: "activeContract" as const, activeContract: { createdEvent: event.created!, synchronizerId: "sync", reassignmentCounter: "0" } },
        }) as GetActiveContractsResponse);
}

/** The scope-visible ACS_DELTA update stream over (begin, end]. */
function windowUpdates(events: readonly LedgerEvent[], begin: number, end: number, scope: readonly string[] | undefined): readonly { offset: string; update: unknown }[] {
    return events
        .filter((event) => BigInt(event.offset) > BigInt(begin) && BigInt(event.offset) <= BigInt(end) && visible(event.witnesses, scope))
        .map((event) => ({
            offset: event.offset,
            update: {
                update: {
                    oneofKind: "transaction",
                    transaction: {
                        offset: event.offset,
                        updateId: `update-${event.offset}`,
                        synchronizerId: "sync",
                        events: [event.kind === "create"
                            ? { event: { oneofKind: "created", created: event.created! } }
                            : { event: { oneofKind: "archived", archived: { contractId: event.contractId } } }],
                    },
                },
            },
        }));
}

function chunk<T>(values: readonly T[], size: number): readonly (readonly T[])[] {
    const chunks: T[][] = [];

    for (let index = 0; index < values.length; index += size) {
        chunks.push(values.slice(index, index + size));
    }

    return chunks;
}

describe("gRPC contract cache delta refresh equivalence (property)", () => {
    it("delta-patched snapshots equal full downloads for any history, split, scope, and paging", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(
                    fc.oneof(
                        fc.record({
                            kind: fc.constant<"create">("create"),
                            witnessMask: fc.integer({ min: 0, max: 7 }),
                            packageIndex: fc.nat(10),
                            representativeIndex: fc.nat(3),
                            entityIndex: fc.nat(3),
                            ownerIndex: fc.nat(5),
                        }),
                        fc.record({ kind: fc.constant<"archive">("archive"), pick: fc.nat(30) }),
                    ),
                    { maxLength: 40 },
                ),
                fc.nat(40),
                fc.nat(40),
                fc.nat(40),
                fc.oneof(fc.constant<readonly string[] | undefined>(undefined), fc.constantFrom<readonly string[]>(["Alice"], ["Bob"], ["Alice", "Carol"])),
                fc.integer({ min: 1, max: 5 }),
                fc.integer({ min: 1, max: 4 }),
                async (ops, splitA, splitB, splitC, scope, acsPageSize, updatePageSize) => {
                    const events = materializeHistory(ops);

                    const total = events.length === 0 ? 0 : Number(events[events.length - 1]!.offset);

                    const [o1, o2, o3] = [splitA % (total + 1), splitB % (total + 1), splitC % (total + 1)].sort((left, right) => left - right) as [number, number, number];

                    await verifyEquivalenceAsync(events, o1, o2, o3, scope, acsPageSize, updatePageSize);
                },
            ),
            { ...propertyParameters({ defaultNumRuns: 150 }) },
        );
    });
});

async function verifyEquivalenceAsync(
    events: readonly LedgerEvent[],
    o1: number,
    o2: number,
    o3: number,
    scope: readonly string[] | undefined,
    acsPageSize: number,
    updatePageSize: number,
): Promise<void> {
    const args = scope === undefined ? undefined : { parties: scope };

    // --- Cache under test: full prewarm at o1, then delta-patched to o2, then chained to o3.
    const acsQueue: { snapshot: readonly GetActiveContractsResponse[]; activeAtOffset: string }[] = [
        { snapshot: acsAt(events, o1, scope), activeAtOffset: String(o1) },
    ];

    let servedPages: (readonly GetActiveContractsResponse[])[] = [];

    let servedOffset = "0";

    const getActiveContractsPageAsync = vi.fn(async (request: { pageToken?: Uint8Array }) => {
        if (request.pageToken === undefined || request.pageToken.length === 0) {
            const next = acsQueue.shift();

            if (next === undefined) {
                throw new Error("Unexpected ACS download.");
            }

            servedPages = next.snapshot.length === 0 ? [[]] : chunk(next.snapshot, acsPageSize);
            servedOffset = next.activeAtOffset;
        }

        const index = request.pageToken === undefined || request.pageToken.length === 0 ? 0 : request.pageToken[0]!;

        return {
            activeAtOffset: servedOffset,
            activeContracts: servedPages[index] ?? [],
            nextPageToken: index + 1 < servedPages.length ? new Uint8Array([index + 1]) : undefined,
        };
    });

    const windows = new Map<string, { pages: { lowest: string; highest: string; updates: readonly unknown[] }[] }>();

    for (const [begin, end] of [[o1, o2], [o2, o3]] as const) {
        if (end <= begin) {
            continue;
        }

        const updates = windowUpdates(events, begin, end, scope);

        const chunks = updates.length === 0 ? [[]] : chunk(updates, updatePageSize);

        const pages = chunks.map((page, index) => ({
            lowest: index === 0 ? String(begin) : chunks[index - 1]!.at(-1)!.offset,
            highest: index === chunks.length - 1 ? String(end) : page.at(-1)!.offset,
            updates: page.map((entry) => entry.update),
        }));

        windows.set(`${begin}:${end}`, { pages });
    }

    let ledgerEnd = String(o2);

    const getUpdatesPageAsync = vi.fn(async (request: { beginOffsetExclusive: string; endOffsetInclusive: string; pageToken?: Uint8Array }) => {
        const window = windows.get(`${request.beginOffsetExclusive}:${request.endOffsetInclusive}`);

        if (window === undefined) {
            throw new Error(`Unexpected update window ${request.beginOffsetExclusive}:${request.endOffsetInclusive}.`);
        }

        const index = request.pageToken === undefined || request.pageToken.length === 0 ? 0 : request.pageToken[0]!;

        const page = window.pages[index]!;

        return {
            lowestPageOffsetExclusive: page.lowest,
            highestPageOffsetInclusive: page.highest,
            updates: page.updates,
            nextPageToken: index + 1 < window.pages.length ? new Uint8Array([index + 1]) : undefined,
        };
    });

    const deltaStore = new MemoryQueryCache();

    const cache = new GrpcContractCache(
        {
            getActiveContractsPageAsync,
            getLedgerEndAsync: vi.fn(async () => ({ offset: ledgerEnd })),
            getLatestPrunedOffsetsAsync: vi.fn(async () => ({ participantPrunedUpToInclusive: "0" })),
        } as never,
        deltaStore,
        60_000,
        "equivalence",
        () => 1_000,
        undefined,
        { getUpdatesPageAsync } as never,
        { enabled: true },
    );

    await cache.cacheContracts(args);

    const first = await cache.cacheContracts(args);

    expect(["delta", "noop"]).toContain(first.cached ? first.refresh : "");

    ledgerEnd = String(o3);

    const second = await cache.cacheContracts(args);

    expect(["delta", "noop"]).toContain(second.cached ? second.refresh : "");

    // --- Ground truth: an independent full download at o3.
    const fullStore = new MemoryQueryCache();

    const fullAcs = acsAt(events, o3, scope);

    let fullPages: (readonly GetActiveContractsResponse[])[] = fullAcs.length === 0 ? [[]] : chunk(fullAcs, acsPageSize);

    const fullCache = new GrpcContractCache(
        {
            getActiveContractsPageAsync: vi.fn(async (request: { pageToken?: Uint8Array }) => {
                const index = request.pageToken === undefined || request.pageToken.length === 0 ? 0 : request.pageToken[0]!;

                return {
                    activeAtOffset: String(o3),
                    activeContracts: fullPages[index] ?? [],
                    nextPageToken: index + 1 < fullPages.length ? new Uint8Array([index + 1]) : undefined,
                };
            }),
        } as never,
        fullStore,
        60_000,
        "equivalence",
        () => 1_000,
    );

    await fullCache.cacheContracts(args);

    const patched = await cache.readSnapshotAsync(args);

    const groundTruth = await fullCache.readSnapshotAsync(args);

    expect(patched).toBeDefined();
    expect(groundTruth).toBeDefined();
    expect(patched!.activeAtOffset).toBe(String(o3));
    expect(patched!.contracts).toEqual(groundTruth!.contracts);
    expect(patched!.creationMetadata).toEqual(groundTruth!.creationMetadata);
}
