import { describe, expect, it } from "vitest";
import {
    assertQueryPageArgs,
    type ContractFindManyArgs,
} from "../../../src/query/model-types.js";

describe("query model types", () => {
    it("accepts Prisma-like contract arguments", () => {
        const args: ContractFindManyArgs = {
            parties: ["Alice", "Bob"],
            where: {
                templateId: { equals: "package-id:Module:Template" },
                active: true,
            },
            orderBy: { createdEventOffset: "desc" },
            take: 25,
            select: { contractId: true, payload: true },
        };

        expect(args.parties).toEqual(["Alice", "Bob"]);
        expect(args.select).toEqual({ contractId: true, payload: true });
    });

    it.each([-1, 1.5, Number.NaN])(
        "rejects an invalid take value %s",
        (take) => {
            expect(() => assertQueryPageArgs({ take })).toThrow(
                "take must be a non-negative integer",
            );
        },
    );

    it.each([-1, 1.5, Number.NaN])(
        "rejects an invalid skip value %s",
        (skip) => {
            expect(() => assertQueryPageArgs({ skip })).toThrow(
                "skip must be a non-negative integer",
            );
        },
    );
});
