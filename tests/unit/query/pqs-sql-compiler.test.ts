import { describe, expect, it } from "vitest";
import { compileContractFindMany } from "../../../src/query/pqs/pqs-sql-compiler.js";
import { PqsSchemaProfileV1 } from "../../../src/query/pqs/pqs-schema-profile.js";

describe("PQS SQL compiler", () => {
    it("binds contract filters as positional values", () => {
        const query = compileContractFindMany(
            {
                where: {
                    templateId: { equals: "package:Module:Template" },
                    active: true,
                    witnesses: { has: "Alice" },
                },
                orderBy: { createdEventOffset: "desc" },
                take: 20,
                skip: 10,
            },
            new PqsSchemaProfileV1("public"),
        );

        expect(query.text).toContain('from "public"."__contracts" contract_row');
        expect(query.text).toContain("contract_row.creation_package_id");
        expect(query.text).toContain("$1");
        expect(query.text).not.toContain("package:Module:Template");
        expect(query.values).toEqual(["package:Module:Template", "Alice", 20, 10]);
    });
});
