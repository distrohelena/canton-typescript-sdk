import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const packageName = "@distrohelena/canton-typescript-sdk";

describe("CommonJS package exports", () => {
    it("resolves every public entry point through require", () => {
        const output = execFileSync(
            process.execPath,
            [
                "--eval",
                [
                    `for (const entry of ${JSON.stringify([
                        packageName,
                        `${packageName}/daml-interface`,
                        `${packageName}/daml-lf`,
                        `${packageName}/debugger`,
                        `${packageName}/grpc`,
                        `${packageName}/protobuf`,
                        `${packageName}/json`,
                        `${packageName}/testing`,
                    ])}) {`,
                    "    const loaded = require(entry);",
                    "    if (loaded === undefined) throw new Error(`require returned undefined for ${entry}`);",
                    "}",
                ].join("\n"),
            ],
            { cwd: process.cwd(), encoding: "utf8" },
        );

        expect(output).toBe("");
    });
});
