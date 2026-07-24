import { describe, expect, it } from "vitest";
import { PqsSchemaProfileError } from "../../../src/query/errors/pqs-schema-profile-error.js";
import {
    PqsSchemaProfileV1,
    assertPqsSchemaIdentifier,
    requiredPqsRelations,
    validatePqsSchemaAsync,
} from "../../../src/query/pqs/pqs-schema-profile.js";

describe("PQS schema profile", () => {
    it("defaults the v1 profile to the public schema", () => {
        expect(new PqsSchemaProfileV1().schema).toBe("public");
        expect(requiredPqsRelations).toContain("__contracts");
        expect(requiredPqsRelations).toContain("__watermark");
    });

    it("rejects unsafe schema identifiers", () => {
        expect(() => assertPqsSchemaIdentifier("public; drop table users")).toThrow(
            PqsSchemaProfileError,
        );
    });

    it("rejects a database missing a required v1 column", async () => {
        await expect(
            validatePqsSchemaAsync(
                {
                    query: async () => ({
                        rows: [
                            {
                                table_name: "__contracts",
                                column_name: "contract_id",
                            },
                        ],
                    }),
                },
                new PqsSchemaProfileV1(),
            ),
        ).rejects.toThrow(PqsSchemaProfileError);
    });
});
