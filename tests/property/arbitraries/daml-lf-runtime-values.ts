import * as fc from "fast-check";

const text = fc.string({ maxLength: 16 });

const identifier = fc.string({ minLength: 1, maxLength: 16 });

const runtimeArbitraries = fc.letrec<{ value: unknown }>((tie) => ({
    value: fc.oneof(
        fc.constant({ kind: "unit" }),
        fc.boolean().map((value) => ({ kind: "boolean", value })),
        text.map((value) => ({ kind: "text", value })),
        fc.bigInt({ min: -(2n ** 63n), max: 2n ** 63n - 1n }).map((value) => ({
            kind: "int64",
            value: value.toString(),
        })),
        text.map((value) => ({ kind: "numeric", value })),
        identifier.map((value) => ({ kind: "party", value })),
        identifier.map((value) => ({ kind: "contractId", value })),
        fc.array(tie("value"), { maxLength: 4 }).map((value) => ({
            kind: "ledgerValue",
            value,
        })),
        fc.dictionary(identifier, tie("value"), { maxKeys: 4 }).map((fields) => ({
            kind: "record",
            fields,
        })),
    ),
}));

export const runtimeValueArbitrary = runtimeArbitraries.value;
