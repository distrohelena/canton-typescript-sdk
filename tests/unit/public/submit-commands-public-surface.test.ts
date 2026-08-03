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

    it("finds the removed request module path", () => {
        expect(
            findRemovedSubmitCommandUsages(
                `import value from "./${removedModuleName}.js"`,
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

    it("has no removed request surface in handwritten sources", () => {
        const files = collectHandwrittenSourceFiles([
            "src",
            "examples",
            "tests",
        ]);

        const usages = files.flatMap(file =>
            findRemovedSubmitCommandUsages(readFileSync(file, "utf8")).map(
                usage => `${relative(process.cwd(), file)}: ${usage}`,
            ),
        );

        expect(usages).toEqual([]);
    });
});

function collectHandwrittenSourceFiles(directories: readonly string[]): string[] {
    const files: string[] = [];

    const collect = (directory: string): void => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            const path = join(directory, entry.name);

            if (entry.isDirectory()) {
                if (path.includes(`${join("src", "transports", "grpc", "generated")}/`)) {
                    continue;
                }

                collect(path);
            } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
                files.push(path);
            }
        }
    };

    for (const directory of directories) {
        collect(directory);
    }

    return files;
}
