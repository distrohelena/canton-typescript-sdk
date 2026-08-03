import { describe, expect, it } from "vitest";
import { PqsQueryClient } from "../../../src/query/pqs/pqs-query-client.js";
import { PqsSchemaProfileV1 } from "../../../src/query/pqs/pqs-schema-profile.js";
import { evaluatorCases } from "./query-conformance-fixture.js";

describe("PQS conformance harness", () => {
    it.each(evaluatorCases)("executes the $name canonical case through PQS with exact parameterized calls", async (entry) => {
        const calls: { text: string; values: readonly unknown[] }[] = [];

        const pendingRows = [...entry.executorRows];

        const client = new PqsQueryClient({ query: async (text, values) => {
            calls.push({ text, values });

            const rows = pendingRows.shift();

            if (rows === undefined) {
                throw new Error(`Unexpected executor call for ${entry.name}`);
            }

            return { rows };
        } }, new PqsSchemaProfileV1());

        await expect(entry.invoke(client, entry.args)).resolves.toEqual(entry.expected);
        expect(pendingRows).toEqual([]);
        expect(calls).toMatchSnapshot();
    });
});
