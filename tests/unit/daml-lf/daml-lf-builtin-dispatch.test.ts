import { describe, expect, it } from "vitest";
import { DamlLfBuiltinDispatch } from "../../../src/daml-lf/interpreter/daml-lf-builtin-dispatch.js";

describe("DamlLfBuiltinDispatch", () => {
    it("converts party runtime values through PARTY_TO_TEXT", () => {
        const dispatch = new DamlLfBuiltinDispatch();

        const result = dispatch.applyOrThrow(
            {
                kind: "builtin",
                builtinFunction: "PARTY_TO_TEXT",
                appliedArguments: [],
            },
            [
                {
                    kind: "party",
                    value: "Alice::1220",
                },
            ],
        );

        expect(result).toEqual({
            kind: "text",
            value: "Alice::1220",
        });
    });

    it("accepts text runtime values through PARTY_TO_TEXT", () => {
        const dispatch = new DamlLfBuiltinDispatch();

        const result = dispatch.applyOrThrow(
            {
                kind: "builtin",
                builtinFunction: "PARTY_TO_TEXT",
                appliedArguments: [],
            },
            [
                {
                    kind: "text",
                    value: "Alice::1220",
                },
            ],
        );

        expect(result).toEqual({
            kind: "text",
            value: "Alice::1220",
        });
    });

    it("treats equal party and text runtime values as equal", () => {
        const dispatch = new DamlLfBuiltinDispatch();

        const result = dispatch.applyOrThrow(
            {
                kind: "builtin",
                builtinFunction: "equal",
                appliedArguments: [],
            },
            [
                {
                    kind: "party",
                    value: "Alice::1220",
                },
                {
                    kind: "text",
                    value: "Alice::1220",
                },
            ],
        );

        expect(result).toEqual({
            kind: "boolean",
            value: true,
        });
    });

    it("coerces text runtime values through COERCE_CONTRACT_ID", () => {
        const dispatch = new DamlLfBuiltinDispatch();

        const result = dispatch.applyOrThrow(
            {
                kind: "builtin",
                builtinFunction: "COERCE_CONTRACT_ID",
                appliedArguments: [],
            },
            [
                {
                    kind: "text",
                    value: "00abc123",
                },
            ],
        );

        expect(result).toEqual({
            kind: "contractId",
            value: "00abc123",
        });
    });

    it("accepts text-compatible int64 values in int64 builtins", () => {
        const dispatch = new DamlLfBuiltinDispatch();

        const result = dispatch.applyOrThrow(
            {
                kind: "builtin",
                builtinFunction: "ADD_INT64",
                appliedArguments: [],
            },
            [
                {
                    kind: "text",
                    value: "2",
                },
                {
                    kind: "int64",
                    value: "3",
                },
            ],
        );

        expect(result).toEqual({
            kind: "int64",
            value: "5",
        });
    });

    it("preserves exact decimal precision in numeric builtins", () => {
        const dispatch = new DamlLfBuiltinDispatch();

        const result = dispatch.applyOrThrow(
            {
                kind: "builtin",
                builtinFunction: "ADD_NUMERIC",
                appliedArguments: [],
            },
            [
                {
                    kind: "text",
                    value: "2400.1295214227",
                },
                {
                    kind: "text",
                    value: "0.0000000000",
                },
            ],
        );

        expect(result).toEqual({
            kind: "numeric",
            value: "2400.1295214227",
        });
    });

    it("rounds DIV_NUMERIC to the witness scale with half-even semantics", () => {
        const dispatch = new DamlLfBuiltinDispatch();

        const result = dispatch.applyOrThrow(
            {
                kind: "builtin",
                builtinFunction: "DIV_NUMERIC",
                appliedArguments: [],
            },
            [
                {
                    kind: "text",
                    value: "1.0000000000",
                },
                {
                    kind: "text",
                    value: "11033036.70001019070817980544",
                },
                {
                    kind: "text",
                    value: "38621.1251916448",
                },
            ],
        );

        expect(result).toEqual({
            kind: "numeric",
            value: "285.6736215028",
        });
    });

    it("shifts numerics using the witness scale", () => {
        const dispatch = new DamlLfBuiltinDispatch();

        const result = dispatch.applyOrThrow(
            {
                kind: "builtin",
                builtinFunction: "SHIFT_NUMERIC",
                appliedArguments: [],
            },
            [
                {
                    kind: "text",
                    value: "1.0000000000",
                },
                {
                    kind: "text",
                    value: "1.0",
                },
            ],
        );

        expect(result).toEqual({
            kind: "numeric",
            value: "0.0000000001",
        });
    });

    it("truncates NUMERIC_TO_INT64 toward zero", () => {
        const dispatch = new DamlLfBuiltinDispatch();

        const result = dispatch.applyOrThrow(
            {
                kind: "builtin",
                builtinFunction: "NUMERIC_TO_INT64",
                appliedArguments: [],
            },
            [
                {
                    kind: "text",
                    value: "-2.9",
                },
            ],
        );

        expect(result).toEqual({
            kind: "int64",
            value: "-2",
        });
    });

    it("inserts and looks up values in text maps", () => {
        const dispatch = new DamlLfBuiltinDispatch();

        const inserted = dispatch.applyOrThrow(
            {
                kind: "builtin",
                builtinFunction: "TEXTMAP_INSERT",
                appliedArguments: [],
            },
            [
                {
                    kind: "text",
                    value: "owner",
                },
                {
                    kind: "party",
                    value: "Alice::1220",
                },
                {
                    kind: "builtin",
                    builtinFunction: "TEXTMAP_EMPTY",
                    appliedArguments: [],
                },
            ],
        );

        expect(inserted).toEqual({
            kind: "ledgerValue",
            value: {
                owner: {
                    __damlLfParty: "Alice::1220",
                },
            },
        });

        const lookedUp = dispatch.applyOrThrow(
            {
                kind: "builtin",
                builtinFunction: "TEXTMAP_LOOKUP",
                appliedArguments: [],
            },
            [
                {
                    kind: "text",
                    value: "owner",
                },
                inserted,
            ],
        );

        expect(lookedUp).toEqual({
            kind: "party",
            value: "Alice::1220",
        });
    });

    it("inserts and looks up values in gen maps", () => {
        const dispatch = new DamlLfBuiltinDispatch();

        const inserted = dispatch.applyOrThrow(
            {
                kind: "builtin",
                builtinFunction: "GENMAP_INSERT",
                appliedArguments: [],
            },
            [
                {
                    kind: "contractId",
                    value: "00abc123",
                },
                {
                    kind: "text",
                    value: "vault",
                },
                {
                    kind: "builtin",
                    builtinFunction: "GENMAP_EMPTY",
                    appliedArguments: [],
                },
            ],
        );

        expect(inserted).toEqual({
            kind: "ledgerValue",
            value: [
                {
                    key: {
                        __damlLfContractId: "00abc123",
                    },
                    value: "vault",
                },
            ],
        });

        const lookedUp = dispatch.applyOrThrow(
            {
                kind: "builtin",
                builtinFunction: "GENMAP_LOOKUP",
                appliedArguments: [],
            },
            [
                {
                    kind: "contractId",
                    value: "00abc123",
                },
                inserted,
            ],
        );

        expect(lookedUp).toEqual({
            kind: "text",
            value: "vault",
        });
    });
});
