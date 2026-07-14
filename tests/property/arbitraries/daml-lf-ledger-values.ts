import * as fc from "fast-check";

const shortText = fc.string({ maxLength: 16 });

const nonEmptyText = fc.string({ minLength: 1, maxLength: 16 });

const leafLedgerValue = fc.oneof(
    fc.constant({ sum: { oneofKind: "unit", unit: {} } }),
    fc.boolean().map((bool) => ({ sum: { oneofKind: "bool", bool } })),
    fc.bigInt({ min: -(2n ** 63n), max: 2n ** 63n - 1n }).map((int64) => ({
        sum: { oneofKind: "int64", int64: int64.toString() },
    })),
    fc.integer({ min: -100_000, max: 100_000 }).map((date) => ({
        sum: { oneofKind: "date", date },
    })),
    fc.integer({ min: -100_000, max: 100_000 }).map((timestamp) => ({
        sum: { oneofKind: "timestamp", timestamp },
    })),
    shortText.map((text) => ({ sum: { oneofKind: "text", text } })),
    fc
        .tuple(
            fc.integer({ min: -100_000, max: 100_000 }),
            fc.integer({ min: 0, max: 6 }),
        )
        .map(([whole, scale]) => ({
            sum: {
                oneofKind: "numeric",
                numeric: `${whole}.${"0".repeat(scale)}`,
            },
        })),
    nonEmptyText.map((party) => ({ sum: { oneofKind: "party", party } })),
    nonEmptyText.map((contractId) => ({
        sum: { oneofKind: "contractId", contractId },
    })),
    nonEmptyText.map((constructor) => ({
        sum: {
            oneofKind: "enum",
            enum: { constructor },
        },
    })),
);

const ledgerArbitraries = fc.letrec<{ value: unknown }>((tie) => ({
    value: fc.oneof(
        leafLedgerValue,
        fc.oneof(
            fc.constant({}),
            tie("value").map((value) => ({ value })),
        ).map((optional) => ({
            sum: { oneofKind: "optional", optional },
        })),
        fc.array(tie("value"), { maxLength: 4 }).map((elements) => ({
            sum: {
                oneofKind: "list",
                list: { elements },
            },
        })),
        fc.array(
            fc.record({
                key: nonEmptyText,
                value: tie("value"),
            }),
            { maxLength: 4 },
        ).map((entries) => ({
            sum: {
                oneofKind: "textMap",
                textMap: { entries },
            },
        })),
        fc.array(
            fc.record({
                key: tie("value"),
                value: tie("value"),
            }),
            { maxLength: 4 },
        ).map((entries) => ({
            sum: {
                oneofKind: "genMap",
                genMap: { entries },
            },
        })),
        fc.array(
            fc.record({
                label: shortText,
                value: tie("value"),
            }),
            { maxLength: 4 },
        ).map((fields) => ({
            sum: {
                oneofKind: "record",
                record: { fields },
            },
        })),
        fc.record({
            constructor: nonEmptyText,
            value: tie("value"),
        }).map((variant) => ({
            sum: {
                oneofKind: "variant",
                variant,
            },
        })),
    ),
}));

export const ledgerValueArbitrary = ledgerArbitraries.value;

