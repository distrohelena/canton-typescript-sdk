import { describe, expect, it } from "vitest";
import { DamlLfLexicalScope } from "../../../src/daml-lf/interpreter/daml-lf-lexical-scope.js";

describe("DamlLfLexicalScope", () => {
    it("resolves bindings from deep scope chains without recursive overflow", () => {
        const root = new DamlLfLexicalScope();
        root.setBinding("rootValue", {
            kind: "text",
            value: "root",
        });

        let scope = root;

        for (let index = 0; index < 20_000; index += 1) {
            scope = scope.createChild();
            scope.setBinding(`value${index}`, {
                kind: "int64",
                value: String(index),
            });
        }

        expect(scope.getBinding("rootValue")).toEqual({
            kind: "text",
            value: "root",
        });
        expect(scope.getBinding("value19999")).toEqual({
            kind: "int64",
            value: "19999",
        });
        expect(scope.getBinding("missing")).toBeUndefined();
    });

    it("snapshots deep scope chains without recursive overflow", () => {
        const root = new DamlLfLexicalScope();
        root.setBinding("shared", {
            kind: "text",
            value: "root",
        });

        let scope = root;

        for (let index = 0; index < 20_000; index += 1) {
            scope = scope.createChild();
            scope.setBinding(`value${index}`, {
                kind: "int64",
                value: String(index),
            });
        }

        scope.setBinding("shared", {
            kind: "text",
            value: "leaf",
        });

        const bindings = scope.snapshotBindings();

        expect(bindings).toHaveLength(20_001);
        expect(bindings.find((binding) => binding.name === "shared")?.value).toEqual({
            kind: "text",
            value: "leaf",
        });
        expect(
            bindings.find((binding) => binding.name === "value19999")?.value,
        ).toEqual({
            kind: "int64",
            value: "19999",
        });
    });

    it("stops traversing malformed cyclic parent chains", () => {
        const root = new DamlLfLexicalScope();
        const child = root.createChild();

        root.setBinding("rootOnly", {
            kind: "text",
            value: "root",
        });
        child.setBinding("childOnly", {
            kind: "text",
            value: "child",
        });
        child.setBinding("shared", {
            kind: "text",
            value: "child",
        });
        root.setBinding("shared", {
            kind: "text",
            value: "root",
        });

        (
            root as unknown as {
                parent?: DamlLfLexicalScope;
            }
        ).parent = child;

        expect(child.snapshotBindings()).toEqual([
            {
                name: "rootOnly",
                value: {
                    kind: "text",
                    value: "root",
                },
            },
            {
                name: "shared",
                value: {
                    kind: "text",
                    value: "child",
                },
            },
            {
                name: "childOnly",
                value: {
                    kind: "text",
                    value: "child",
                },
            },
        ]);
        expect(child.getBinding("rootOnly")).toEqual({
            kind: "text",
            value: "root",
        });
        expect(child.getBinding("shared")).toEqual({
            kind: "text",
            value: "child",
        });
    });
});
