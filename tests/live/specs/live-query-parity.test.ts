import { afterAll, describe, expect, it } from "vitest";
import {
    LiveQueryManagers,
    createDefaultLiveQueryManagerOptions,
    createLiveQueryManagersAsync,
    seedLiveQueryParityFixtureAsync,
    waitForLivePqsParityFixtureAsync,
} from "../runtime/live-query-manager-factory.js";

// The matrix runner sets SDK_TEST_PQS_AVAILABLE=0 on legs booted without PQS; parity needs both sources.
describe.skipIf(process.env.SDK_TEST_PQS_AVAILABLE === "0")("live gRPC and PQS typed-query parity", () => {
    let managers: LiveQueryManagers | undefined;

    afterAll(async () => {
        await managers?.disposeAsync();
    }, 30_000);

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
            canonicalEventKeys: await manager.query.events.findMany({
                where: {
                    pk: { gte: "1" },
                    txIx: { gte: fixture.archivedAtOffset },
                },
                orderBy: [{ pk: "asc" }],
                take: 10,
                include: { transaction: true },
            }),
            canonicalExerciseKeys: await manager.query.exercises.findMany({
                where: {
                    tpePk: { gte: "1" },
                    contractTpePk: { gte: "1" },
                    exerciseEventPk: { isNot: null },
                    exercisedAtIx: { gte: fixture.archivedAtOffset },
                    packagePk: { gte: "1" },
                },
                orderBy: [{ tpePk: "asc" }, { contractTpePk: "asc" }, { exerciseEventPk: "asc" }, { exercisedAtIx: "asc" }, { packagePk: "asc" }],
                take: 10,
            }),
            canonicalAggregates: {
                events: await manager.query.events.aggregate({
                    where: { exercises: { some: { contractId: { equals: fixture.archivedContractId } } } },
                    count: true,
                    min: ["pk", "txIx"],
                    max: ["pk", "txIx"],
                    sum: ["pk", "txIx"],
                }),
                exercises: await manager.query.exercises.aggregate({
                    where: { contractId: { equals: fixture.archivedContractId } },
                    count: true,
                    min: ["tpePk", "contractTpePk", "exerciseEventPk", "exercisedAtIx", "packagePk"],
                    max: ["tpePk", "contractTpePk", "exerciseEventPk", "exercisedAtIx", "packagePk"],
                    sum: ["tpePk", "contractTpePk", "exerciseEventPk", "exercisedAtIx", "packagePk"],
                }),
                packages: await manager.query.packages.aggregate({
                    where: { id: { equals: fixture.packageId } },
                    count: true,
                    min: ["pk"],
                    max: ["pk"],
                    sum: ["pk"],
                }),
                transactions: await manager.query.transactions.aggregate({
                    where: { exercises: { some: { contractId: { equals: fixture.archivedContractId } } } },
                    count: true,
                    min: ["ix"],
                    max: ["ix"],
                    sum: ["ix"],
                }),
            },
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
            expect(result.watermark).toEqual([{ singleton: true }]);
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

        expect(canonicalLiveValue(grpc)).toEqual(canonicalLiveValue(pqs));

        const grpcEvent = grpc.canonicalEventKeys[0]!;

        const pqsEvent = pqs.canonicalEventKeys[0]!;

        const grpcTransaction = grpc.transactions[0]!;

        const pqsTransaction = pqs.transactions[0]!;

        const [grpcEventByPk, pqsEventByPk, grpcTransactionByIx, pqsTransactionByIx] = await Promise.all([
            managers.grpc.query.events.findUnique({ where: { pk: grpcEvent.pk } }),
            managers.pqs.query.events.findUnique({ where: { pk: pqsEvent.pk } }),
            managers.grpc.query.transactions.findUnique({ where: { ix: grpcTransaction.ix } }),
            managers.pqs.query.transactions.findUnique({ where: { ix: pqsTransaction.ix } }),
        ]);

        expect(grpcEventByPk).toEqual(pqsEventByPk);
        expect(grpcTransactionByIx).toEqual(pqsTransactionByIx);

        const nestedCanonicalKey = grpc.nested[0]?.exercises?.[0]?.tpePk;

        expect(nestedCanonicalKey).toMatch(/^\d+$/);
        expect(BigInt(nestedCanonicalKey!)).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER));
        expect(pqs.nested[0]?.exercises?.[0]?.tpePk).toBe(nestedCanonicalKey);
    }, 600_000);
});

const exerciseRelations = {
    transaction: true,
    package: true,
    contractType: true,
    exerciseType: true,
    event: true,
} as const;

function canonicalLiveValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(canonicalLiveValue);
    } else if (value instanceof Date) {
        return value.toISOString();
    } else if (value instanceof Uint8Array || typeof value !== "object" || value === null) {
        return value;
    }

    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, canonicalLiveValue(nested)]));
}
