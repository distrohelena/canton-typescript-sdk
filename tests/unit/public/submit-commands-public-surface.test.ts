import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import * as sdk from "../../../src";
import {
    CreateCommand,
    DamlRecord,
    type NonEmptyLedgerCommands,
    SubmitCommandsRequest,
} from "../../../src";
import { findRemovedSubmitCommandUsages } from "./submit-commands-source-guard";

const removedRequestName = ["Submit", "CommandRequest"].join("");

const removedModuleName = ["submit", "command", "request"].join("-");

interface RootPackageExport {
    readonly import: string;
    readonly require: string;
    readonly types: string;
}

interface PackageManifest {
    readonly exports: {
        readonly ".": RootPackageExport;
    };
    readonly files: readonly string[];
}

describe("SubmitCommandsRequest public surface", () => {
    it("exports the plural request and non-empty command batch type", () => {
        const commands: NonEmptyLedgerCommands = [
            new CreateCommand({
                templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                createArguments: new DamlRecord({}),
            }),
        ];

        const request = new SubmitCommandsRequest({
            applicationId: "app-1",
            actAs: ["Alice"],
            commands,
        });

        expect(request.commands).toEqual(commands);
    });

    it("does not expose the singular request from the root runtime namespace", () => {
        expect(removedRequestName in sdk).toBe(false);
    });

    it("finds the exact removed request identifier", () => {
        expect(
            findRemovedSubmitCommandUsages(
                `const x: ${removedRequestName} = value`,
            ),
        ).toContain(removedRequestName);
    });

    it("finds the exact removed request identifier in a function return type", () => {
        expect(
            findRemovedSubmitCommandUsages(
                `function create(): ${removedRequestName} { throw new Error(); }`,
            ),
        ).toContain(removedRequestName);
    });

    it("finds the removed request module path", () => {
        expect(
            findRemovedSubmitCommandUsages(
                `import value from "./${removedModuleName}.js"`,
            ),
        ).toContain(removedModuleName);
    });

    it("ignores static exports without module specifiers", () => {
        expect(
            findRemovedSubmitCommandUsages("export { value };"),
        ).toEqual([]);
    });

    it("finds the removed request dynamic import path", () => {
        expect(
            findRemovedSubmitCommandUsages(
                `void import("./${removedModuleName}.js")`,
            ),
        ).toContain(removedModuleName);
    });

    it("finds singular command access on a typed plural request", () => {
        expect(
            findRemovedSubmitCommandUsages(
                "function f(request: SubmitCommandsRequest) { return request.command; }",
            ),
        ).toContain("request.command");
    });

    it("finds singular command access on a constructed plural request", () => {
        expect(
            findRemovedSubmitCommandUsages(
                "const batch = new SubmitCommandsRequest(init); batch.command;",
            ),
        ).toContain("batch.command");
    });

    it("does not confuse unrelated or plural command properties with the removed property", () => {
        expect(
            findRemovedSubmitCommandUsages(
                "request.commands\nrequest.commandId\npayload.command\naction.command\ninit.command",
            ),
        ).toEqual([]);
    });

    it("ignores uninitialized declarations while establishing request receivers", () => {
        expect(
            findRemovedSubmitCommandUsages("let pendingRequest: unknown;"),
        ).toEqual([]);
    });

    it("does not inherit a request receiver through a shadowing function parameter", () => {
        expect(
            findRemovedSubmitCommandUsages(
                "function outer(request: SubmitCommandsRequest) { function inner(request: unknown) { return request.command; } }",
            ),
        ).toEqual([]);
    });

    it("does not treat a containing generic type as a request receiver", () => {
        expect(
            findRemovedSubmitCommandUsages(
                "function f(request: Promise<SubmitCommandsRequest>) { return request.command; }",
            ),
        ).toEqual([]);
    });

    it("declares plural package root export mappings and source exports", () => {
        const packageManifest = JSON.parse(
            readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
        ) as PackageManifest;

        const rootExport = packageManifest.exports["."];

        const rootSource = readFileSync(
            new URL("../../../src/index.ts", import.meta.url),
            "utf8",
        );

        expect(packageManifest.files).toContain("dist");
        expect(rootExport).toEqual({
            types: "./dist/index.d.ts",
            import: "./dist/index.js",
            require: "./dist/cjs/index.js",
        });
        expect(rootSource).toContain("SubmitCommandsRequest");
        expect(rootSource).toContain("NonEmptyLedgerCommands");
        expect(rootSource).not.toContain(removedRequestName);
        expect(rootSource).not.toContain(removedModuleName);
        expect(sdk.SubmitCommandsRequest).toBe(SubmitCommandsRequest);
        expect(removedRequestName in sdk).toBe(false);
    });

    it("does not leak typed request bindings through loop, catch, destructuring, or TDZ shadows", () => {
        expect(findRemovedSubmitCommandUsages(
            "function f(request: SubmitCommandsRequest) { for (const request of values) { request.command; } }",
        )).toEqual([]);
        expect(findRemovedSubmitCommandUsages(
            "function f(request: SubmitCommandsRequest) { try {} catch (request) { request.command; } }",
        )).toEqual([]);
        expect(findRemovedSubmitCommandUsages(
            "function f(request: SubmitCommandsRequest) { const { request } = value; request.command; }",
        )).toEqual([]);
        expect(findRemovedSubmitCommandUsages(
            "function f(request: SubmitCommandsRequest) { request.command; const request = value; }",
        )).toEqual([]);
    });

    it("recognizes qualified constructors and direct union/intersection request annotations", () => {
        expect(findRemovedSubmitCommandUsages(
            "const request = new sdk.SubmitCommandsRequest(init); request.command;",
        )).toContain("request.command");
        expect(findRemovedSubmitCommandUsages(
            "function f(request: (SubmitCommandsRequest | undefined) & {}) { return request.command; }",
        )).toContain("request.command");
    });

    it("models destructured parameter/type bindings and function-scoped var loop bindings", () => {
        expect(findRemovedSubmitCommandUsages(
            "function f(request: SubmitCommandsRequest, { request: nested }) { nested.command; }",
        )).toEqual([]);
        expect(findRemovedSubmitCommandUsages(
            "const { request }: { request: SubmitCommandsRequest } = value; request.command;",
        )).toContain("request.command");
        expect(findRemovedSubmitCommandUsages(
            "function f(request: SubmitCommandsRequest) { for (var request of values) {} request.command; }",
        )).toEqual([]);
    });

    it("recognizes hoisted var request bindings before nested declarations", () => {
        expect(findRemovedSubmitCommandUsages(
            "function f(){ request.command; { for (var request: SubmitCommandsRequest; ok;) {} } }",
        )).toContain("request.command");
        expect(findRemovedSubmitCommandUsages(
            "function f(){ request.command; { var request: SubmitCommandsRequest; } }",
        )).toContain("request.command");
    });

    it("documents singleton and ordered atomic command batches without a compatibility alias", () => {
        const documentation = readFileSync(
            new URL("../../../DOCUMENTATION.md", import.meta.url),
            "utf8",
        );

        expect(documentation).toContain("    SubmitCommandsRequest,");
        expect(documentation).toContain("new SubmitCommandsRequest({");
        expect(documentation).toMatch(
            /commands: \[\s*new CreateCommand\(/,
        );
        expect(documentation).toMatch(
            /commands: \[\s*new CreateCommand\([\s\S]*?new ExerciseCommand\(/,
        );
        expect(documentation).toContain("non-empty ordered atomic command batch");
        expect(documentation).toMatch(
            /all commands commit together, or none of\s+them do/,
        );
        expect(documentation).toContain("### Migrating a singleton request");
        expect(documentation).toContain("commands: [previousCommand],");
        expect(documentation).toContain("No compatibility alias exists.");
        expect(documentation).toContain("Promise<SubmitCommandResponse>");
        expect(documentation).not.toContain(removedRequestName);
        expect(documentation).not.toContain(removedModuleName);
    });

    it("has no removed request surface in handwritten sources", () => {
        const files = collectHandwrittenSurfaceFiles([
            "src",
            "examples",
            "tests",
            "README.md",
            "DOCUMENTATION.md",
        ]);

        const usages = files.flatMap(file =>
            findRemovedSubmitCommandUsages(readFileSync(file, "utf8")).map(
                usage => `${relative(process.cwd(), file)}: ${usage}`,
            ),
        );

        expect(usages).toEqual([]);
    });
});

function collectHandwrittenSurfaceFiles(paths: readonly string[]): string[] {
    const files: string[] = [];

    const collect = (path: string): void => {
        const entries = readdirSync(path, { withFileTypes: true });

        for (const entry of entries) {
            const entryPath = join(path, entry.name);

            if (entry.isDirectory()) {
                if (entryPath.includes(`${join("src", "transports", "grpc", "generated")}/`)) {
                    continue;
                }

                collect(entryPath);
            } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
                files.push(entryPath);
            }
        }
    };

    for (const path of paths) {
        if (/\.md$/.test(path)) {
            files.push(path);
        } else {
            collect(path);
        }
    }

    return files;
}
