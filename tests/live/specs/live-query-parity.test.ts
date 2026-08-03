import { afterAll, describe, expect, it } from "vitest";
import {
    LiveQueryManagers,
    createDefaultLiveQueryManagerOptions,
    createLiveQueryManagersAsync,
    seedLiveQueryParityFixtureAsync,
    waitForLivePqsContractsAsync,
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
        await waitForLivePqsContractsAsync(managers.pqs, [
            fixture.activeContractId,
            fixture.archivedContractId,
        ]);

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
                        include: { transaction: true },
                    },
                },
            }),
            events: await manager.query.events.findMany({
                where: {
                    exercises: {
                        some: { contractId: { equals: fixture.archivedContractId } },
                    },
                },
                orderBy: [{ eventId: "asc" }],
                take: 10,
                include: { transaction: true },
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
                },
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
        });

        const [grpc, pqs] = await Promise.all([
            query(managers.grpc),
            query(managers.pqs),
        ]);

        assertSourceLocalKeyContract(grpc);
        assertSourceLocalKeyContract(pqs);
        expect(withoutSourceLocalKeys(grpc)).toEqual(withoutSourceLocalKeys(pqs));
    });
});

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
            for (const [key, nested] of Object.entries(current)) {
                if (sourceLocalKeys.has(key) && nested !== null) {
                    expect(nested).toMatch(/^\d+$/);
                }

                visit(nested);
            }
        }
    }
}
