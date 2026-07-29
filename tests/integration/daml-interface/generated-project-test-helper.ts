import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DamlInterfaceGenerator } from "../../../src/daml-interface/daml-interface-generator.js";
import { GeneratedDamlInterfaceProject } from "../../../src/daml-interface/emission-model/generated-daml-interface-project.js";
import { DamlInterfaceWriter } from "../../../src/daml-interface/writing/daml-interface-writer.js";

let sdkBuilt = false;

export async function generateTemporaryProjectAsync(
    archiveBytes: Uint8Array,
    consumerSource?: string,
): Promise<GeneratedTemporaryProject> {
    buildSdkOrThrow();

    const project = await new DamlInterfaceGenerator().generateFromDalfOrThrowAsync(
        archiveBytes,
    );

    const directory = await mkdtemp(join(tmpdir(), "daml-generated-project-"));

    try {
        await new DamlInterfaceWriter().writeProjectAsync(project, directory);
        await writeNodeNextProjectFiles(directory, consumerSource);
        await linkSdkPackage(directory);
        compileNodeNextProjectOrThrow(directory);

        return new GeneratedTemporaryProject(directory, project);
    } catch (error) {
        await rm(directory, { recursive: true, force: true });

        throw error;
    }
}

export class GeneratedTemporaryProject {
    public constructor(
        public readonly directory: string,
        public readonly project: GeneratedDamlInterfaceProject,
    ) {}

    public async disposeAsync(): Promise<void> {
        await rm(this.directory, { recursive: true, force: true });
    }
}

function buildSdkOrThrow(): void {
    if (sdkBuilt) {
        return;
    }

    execFileSync("npm", ["run", "build"], {
        cwd: process.cwd(),
        stdio: "pipe",
    });
    sdkBuilt = true;
}

async function writeNodeNextProjectFiles(
    directory: string,
    consumerSource: string | undefined,
): Promise<void> {
    await writeFile(join(directory, "package.json"), JSON.stringify({
        name: "generated-daml-interface-integration-project",
        private: true,
        type: "module",
        dependencies: {
            "@distrohelena/canton-typescript-sdk": `file:${process.cwd()}`,
        },
    }, undefined, 2));
    await writeFile(join(directory, "tsconfig.json"), JSON.stringify({
        compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            strict: true,
            skipLibCheck: true,
            outDir: "dist",
            rootDir: ".",
        },
        include: ["generated/**/*.ts", "consumer.ts"],
    }, undefined, 2));
    await writeFile(join(directory, "consumer.ts"), consumerSource ?? "export {};\n");
}

async function linkSdkPackage(directory: string): Promise<void> {
    const packageDirectory = join(
        directory,
        "node_modules",
        "@distrohelena",
        "canton-typescript-sdk",
    );

    const packageParent = join(directory, "node_modules", "@distrohelena");

    await mkdir(packageParent, { recursive: true });
    await symlink(process.cwd(), packageDirectory, "dir");
}

function compileNodeNextProjectOrThrow(directory: string): void {
    try {
        execFileSync(
            process.execPath,
            [join(process.cwd(), "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.json"],
            { cwd: directory, stdio: "pipe" },
        );
    } catch (error) {
        const failure = error as { readonly stderr?: Buffer; readonly stdout?: Buffer };

        throw new Error([
            "Generated NodeNext project did not typecheck.",
            failure.stdout?.toString("utf8") ?? "",
            failure.stderr?.toString("utf8") ?? "",
        ].join("\n"));
    }
}
