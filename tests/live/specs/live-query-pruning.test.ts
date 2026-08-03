import { afterAll, describe, expect, it } from "vitest";
import { QuerySnapshotIncompleteError } from "../../../src/index.js";
import {
    LiveQueryPruningFixture,
    createLiveQueryPruningFixtureAsync,
} from "../runtime/live-query-pruning-fixture.js";

describe("live gRPC typed query pruning", () => {
    let fixture: LiveQueryPruningFixture | undefined;

    afterAll(async () => {
        await fixture?.disposeAsync();
    });

    it("rejects incomplete historical snapshots without returning partial rows", async () => {
        fixture = await createLiveQueryPruningFixtureAsync();

        await expect(
            fixture.manager.query.contracts.findMany({
                where: {
                    templateId: {
                        packageId: { equals: fixture.templateId.packageId },
                        moduleName: { equals: fixture.templateId.moduleName },
                        entityName: { equals: fixture.templateId.entityName },
                    },
                },
            }),
        ).rejects.toBeInstanceOf(QuerySnapshotIncompleteError);
    }, 90_000);
});
