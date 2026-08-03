import { afterAll, describe, expect, it } from "vitest";
import {
    LiveQueryManagers,
    createDefaultLiveQueryManagerOptions,
    createLiveQueryManagersAsync,
    seedLiveQueryParityFixtureAsync,
    waitForLivePqsParityFixtureAsync,
} from "../runtime/live-query-manager-factory.js";

describe("live gRPC and PQS typed-query parity", () => {
    let managers: LiveQueryManagers | undefined;

    afterAll(async () => {
        await managers?.disposeAsync();
    });

    it("returns equivalent lifecycle, explorer, package, JSON, and aggregate results", async () => {
        const fixture = await seedLiveQueryParityFixtureAsync();

        managers = await createLiveQueryManagersAsync(
            createDefaultLiveQueryManagerOptions(),
        );
        await waitForLivePqsParityFixtureAsync(managers.pqs, fixture);

        const query = async (manager: LiveQueryManagers["grpc"]) => ({
            lifecycle: await manager.query.contracts.findMany({
                where: {
                    contractId: {
                        in: [fixture.activeContractId, fixture.archivedContractId],
                    },
                },
                orderBy: [{ contractId: "asc" }],
            }),
            nested: await manager.query.contracts.findMany({
                where: { contractId: { equals: fixture.archivedContractId } },
                include: {
                    exercises: {
                        take: 10,
                        orderBy: [{ contractId: "asc" }],
                        include: exerciseRelations,
                    },
                },
            }),
            exercises: await manager.query.exercises.findMany({
                where: {
                    contractId: { equals: fixture.archivedContractId },
                },
                orderBy: [{ contractId: "asc" }],
                take: 10,
                include: exerciseRelations,
            }),
            events: await manager.query.events.findMany({
                where: {
                    exercises: {
                        some: { contractId: { equals: fixture.archivedContractId } },
                    },
                },
                orderBy: [{ eventId: "asc" }],
                take: 10,
                include: {
                    transaction: true,
                    exercises: {
                        take: 10,
                        orderBy: [{ contractId: "asc" }],
                        include: exerciseRelations,
                    },
                },
            }),
            transactions: await manager.query.transactions.findMany({
                where: {
                    exercises: {
                        some: { contractId: { equals: fixture.archivedContractId } },
                    },
                },
                orderBy: [{ offset: "asc" }],
                take: 10,
            }),
            packages: await manager.query.packages.findMany({
                where: { id: { equals: fixture.packageId } },
            }),
            types: await manager.query.contractTypes.findMany({
                where: {
                    moduleName: { equals: fixture.templateId.moduleName },
                    entityName: { equals: fixture.templateId.entityName },
                    contracts: {
                        some: { contractId: { equals: fixture.archivedContractId } },
                    },
                },
            }),
            exerciseTypes: await manager.query.exerciseTypes.findMany({
                where: {
                    exercises: {
                        some: { contractId: { equals: fixture.archivedContractId } },
                    },
                },
                orderBy: [{ choice: "asc" }],
            }),
            watermark: await manager.query.watermark.findMany({
                where: {
                    singleton: { equals: true },
                    offset: { gte: fixture.archivedAtOffset },
                },
                select: {
                    singleton: true,
                    offset: true,
                },
                orderBy: [{ offset: "asc" }],
            }),
            payloadProjection: await manager.query.contracts.findMany({
                where: { contractId: { equals: fixture.activeContractId } },
                select: {
                    contractId: true,
                    json: { issuer: { field: "payload", path: ["issuer"], as: "text" } },
                },
            }),
            payloadGroups: await manager.query.contracts.groupBy({
                where: { contractId: { in: [fixture.activeContractId, fixture.archivedContractId] } },
                by: [{ payload: { name: "issuer", path: ["issuer"], as: "text" } }],
                aggregate: { count: true },
            }),
            partyGroups: await manager.query.contracts.groupBy({
                where: { contractId: { in: [fixture.activeContractId, fixture.archivedContractId] } },
                by: ["witnesses"],
                aggregate: { count: true },
            }),
            amountAggregate: await manager.query.contracts.aggregate({
                where: { contractId: { in: [fixture.activeContractId, fixture.archivedContractId] } },
                count: true,
                min: ["createdEventOffset"],
                max: ["createdEventOffset"],
            }),
            sourceLocalEvents: await manager.query.events.findMany({
                where: {
                    exercises: {
                        some: { contractId: { equals: fixture.archivedContractId } },
                    },
                },
                orderBy: [{ pk: "asc" }],
                take: 10,
                include: { transaction: true },
            }),
            sourceLocalTransactions: await manager.query.transactions.findMany({
                where: {
                    exercises: {
                        some: { contractId: { equals: fixture.archivedContractId } },
                    },
                },
                orderBy: [{ ix: "asc" }],
                take: 10,
            }),
        });

        const [grpc, pqs] = await Promise.all([
            query(managers.grpc),
            query(managers.pqs),
        ]);

        const assertFixtureResults = (result: Awaited<ReturnType<typeof query>>): void => {
            expect(result.lifecycle.map((row) => row.contractId)).toEqual([
                fixture.activeContractId,
                fixture.archivedContractId,
            ].sort());
            expect(result.nested).toHaveLength(1);
            expect(result.nested[0]?.contractId).toBe(fixture.archivedContractId);
            expect(result.nested[0]?.exercises?.some((row) =>
                row.contractId === fixture.archivedContractId
            )).toBe(true);
            expect(result.exercises.some((row) =>
                row.contractId === fixture.archivedContractId
            )).toBe(true);
            expect(result.events).not.toHaveLength(0);
            expect(result.transactions).not.toHaveLength(0);
            expect(result.packages.some((row) => row.id === fixture.packageId)).toBe(true);
            expect(result.types.some((row) =>
                row.moduleName === fixture.templateId.moduleName
                && row.entityName === fixture.templateId.entityName
            )).toBe(true);
            expect(result.exerciseTypes.some((row) => row.choice === "Archive")).toBe(true);
            expect(result.watermark.some((row) =>
                row.offset !== null
                && BigInt(row.offset) >= BigInt(fixture.archivedAtOffset)
            )).toBe(true);
            expect(result.payloadProjection).toContainEqual({
                contractId: fixture.activeContractId,
                issuer: fixture.party,
            });
            expect(result.payloadGroups).not.toHaveLength(0);
            expect(result.partyGroups).not.toHaveLength(0);
            expect(result.amountAggregate.count).toBe(2);
        };

        assertFixtureResults(grpc);
        assertFixtureResults(pqs);

        assertSourceLocalKeyContract(grpc);
        assertSourceLocalKeyContract(pqs);
        assertAscendingSourceLocalKeys(grpc.sourceLocalEvents, "pk");
        assertAscendingSourceLocalKeys(pqs.sourceLocalEvents, "pk");
        assertAscendingSourceLocalKeys(grpc.sourceLocalTransactions, "ix");
        assertAscendingSourceLocalKeys(pqs.sourceLocalTransactions, "ix");

        const { sourceLocalEvents: _grpcEvents, sourceLocalTransactions: _grpcTransactions, ...grpcComparable } = grpc;

        const { sourceLocalEvents: _pqsEvents, sourceLocalTransactions: _pqsTransactions, ...pqsComparable } = pqs;

        expect(withoutSourceLocalKeys(grpcComparable)).toEqual(withoutSourceLocalKeys(pqsComparable));
    }, 90_000);
});

const exerciseRelations = {
    transaction: true,
    package: true,
    contractType: true,
    exerciseType: true,
    event: true,
} as const;

const sourceLocalKeys = new Set([
    "pk",
    "ix",
    "txIx",
    "tpePk",
    "contractTpePk",
    "exerciseEventPk",
    "exercisedAtIx",
    "packagePk",
]);

function withoutSourceLocalKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(withoutSourceLocalKeys);
    } else if (value instanceof Uint8Array || value instanceof Date || typeof value !== "object" || value === null) {
        return value;
    }

    return Object.fromEntries(Object.entries(value).flatMap(([key, nested]) =>
        sourceLocalKeys.has(key) ? [] : [[key, withoutSourceLocalKeys(nested)]],
    ));
}

function assertSourceLocalKeyContract(value: unknown): void {
    visit(value);

    function visit(current: unknown): void {
        if (Array.isArray(current)) {
            current.forEach(visit);
        } else if (typeof current === "object" && current !== null) {
            assertSourceLocalRelations(current);

            for (const [key, nested] of Object.entries(current)) {
                if (sourceLocalKeys.has(key) && nested !== null) {
                    expect(nested).toMatch(/^\d+$/);
                }

                visit(nested);
            }
        }
    }
}

function assertSourceLocalRelations(value: object): void {
    const row = value as Record<string, unknown>;

    if ("transaction" in row && typeof row.txIx === "string") {
        expect(row.transaction).toMatchObject({ ix: row.txIx });
    }

    if ("transaction" in row && typeof row.exercisedAtIx === "string") {
        expect(row.transaction).toMatchObject({ ix: row.exercisedAtIx });
    }

    if ("package" in row && typeof row.packagePk === "string") {
        expect(row.package).toMatchObject({ pk: row.packagePk });
    }

    if ("contractType" in row && typeof row.contractTpePk === "string") {
        expect(row.contractType).toMatchObject({ pk: row.contractTpePk });
    }

    if ("exerciseType" in row && typeof row.tpePk === "string") {
        expect(row.exerciseType).toMatchObject({ pk: row.tpePk });
    }

    if ("event" in row && typeof row.exerciseEventPk === "string") {
        expect(row.event).toMatchObject({ pk: row.exerciseEventPk });
    }
}

function assertAscendingSourceLocalKeys(rows: readonly unknown[], key: string): void {
    expect(rows).not.toHaveLength(0);

    const keys = rows.map((row) => {
        const value = (row as Record<string, unknown>)[key];

        expect(value).toMatch(/^\d+$/);

        return value as string;
    });

    expect(keys).toEqual([...keys].sort(compareNumericStrings));
}

function compareNumericStrings(left: string, right: string): number {
    const leftValue = BigInt(left);

    const rightValue = BigInt(right);

    return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
}
