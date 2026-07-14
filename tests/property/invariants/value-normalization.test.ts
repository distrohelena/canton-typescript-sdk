import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
    DAML_LF_CONTRACT_ID_MARKER_KEY,
    DAML_LF_NUMERIC_MARKER_KEY,
    DAML_LF_PARTY_MARKER_KEY,
    DAML_LF_RECORD_ID_MARKER_KEY,
} from "../../../src/daml-lf/interpreter/daml-lf-runtime-value.js";
import { normalizeReplayLedgerValue } from "../../../src/debugger/replay/replay-ledger-value-normalizer.js";
import { ledgerValueArbitrary } from "../arbitraries/daml-lf-ledger-values.js";
import { runtimeValueArbitrary } from "../arbitraries/daml-lf-runtime-values.js";
import { propertyParameters } from "../property-test-options.js";
import { canonicalize } from "../canonicalize.js";

describe("DAML-LF property invariants", () => {
    it("normalizes ledger values idempotently", () => {
        fc.assert(
            fc.property(ledgerValueArbitrary, (value) => {
                expect(
                    canonicalize(
                        normalizeReplayLedgerValue(
                            normalizeReplayLedgerValue(value),
                        ),
                    ),
                ).toEqual(
                    canonicalize(normalizeReplayLedgerValue(value)),
                );
            }),
            propertyParameters(),
        );
    });

    it("canonicalizes generated runtime values idempotently", () => {
        fc.assert(
            fc.property(runtimeValueArbitrary, (value) => {
                expect(canonicalize(canonicalize(value))).toEqual(
                    canonicalize(value),
                );
            }),
            propertyParameters(),
        );
    });

    it.each([
        ["unit", { sum: { oneofKind: "unit", unit: {} } }, null],
        ["bool", { sum: { oneofKind: "bool", bool: true } }, true],
        ["int64", { sum: { oneofKind: "int64", int64: "42" } }, "42"],
        ["date", { sum: { oneofKind: "date", date: 42 } }, 42],
        [
            "timestamp",
            { sum: { oneofKind: "timestamp", timestamp: 42 } },
            42,
        ],
        ["text", { sum: { oneofKind: "text", text: "hello" } }, "hello"],
        [
            "optional",
            {
                sum: {
                    oneofKind: "optional",
                    optional: { value: { sum: { oneofKind: "text", text: "x" } } },
                },
            },
            "x",
        ],
        [
            "list",
            {
                sum: {
                    oneofKind: "list",
                    list: { elements: [{ sum: { oneofKind: "text", text: "x" } }] },
                },
            },
            ["x"],
        ],
        [
            "text map",
            {
                sum: {
                    oneofKind: "textMap",
                    textMap: {
                        entries: [
                            { key: "x", value: { sum: { oneofKind: "text", text: "y" } } },
                        ],
                    },
                },
            },
            { x: "y" },
        ],
        [
            "generic map",
            {
                sum: {
                    oneofKind: "genMap",
                    genMap: {
                        entries: [
                            {
                                key: { sum: { oneofKind: "text", text: "x" } },
                                value: { sum: { oneofKind: "text", text: "y" } },
                            },
                        ],
                    },
                },
            },
            [{ key: "x", value: "y" }],
        ],
        [
            "record",
            {
                sum: {
                    oneofKind: "record",
                    record: {
                        fields: [
                            { label: "value", value: { sum: { oneofKind: "text", text: "x" } } },
                        ],
                    },
                },
            },
            { value: "x" },
        ],
        [
            "variant",
            {
                sum: {
                    oneofKind: "variant",
                    variant: {
                        constructor: "Some",
                        value: { sum: { oneofKind: "text", text: "x" } },
                    },
                },
            },
            { constructor: "Some", value: "x" },
        ],
        [
            "enum",
            { sum: { oneofKind: "enum", enum: { constructor: "Active" } } },
            "Active",
        ],
        [
            "numeric",
            { sum: { oneofKind: "numeric", numeric: "1.5000000000" } },
            { [DAML_LF_NUMERIC_MARKER_KEY]: "1.5000000000" },
        ],
        [
            "party",
            { sum: { oneofKind: "party", party: "Alice" } },
            { [DAML_LF_PARTY_MARKER_KEY]: "Alice" },
        ],
        [
            "contract id",
            { sum: { oneofKind: "contractId", contractId: "00abc" } },
            { [DAML_LF_CONTRACT_ID_MARKER_KEY]: "00abc" },
        ],
        [
            "record id",
            {
                sum: {
                    oneofKind: "record",
                    record: {
                        recordId: {
                            packageId: "pkg-main",
                            moduleName: "Main",
                            entityName: "Vault",
                        },
                        fields: [],
                    },
                },
            },
            {
                [DAML_LF_RECORD_ID_MARKER_KEY]: {
                    packageId: "pkg-main",
                    moduleName: "Main",
                    entityName: "Vault",
                },
            },
        ],
    ] as const)("preserves the %s marker", (_name, raw, expected) => {
        expect(normalizeReplayLedgerValue(raw)).toEqual(expected);
    });
});
