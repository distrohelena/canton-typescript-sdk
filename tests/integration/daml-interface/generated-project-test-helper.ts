import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DamlInterfaceCli } from "../../../src/daml-interface/cli/daml-interface-cli.js";
import { DamlInterfaceGenerator } from "../../../src/daml-interface/daml-interface-generator.js";
import { DamlInterfaceGeneratorOptions } from "../../../src/daml-interface/daml-interface-generator-options.js";
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

        return await finalizeTemporaryProjectAsync(directory, project, consumerSource);
    } catch (error) {
        await rm(directory, { recursive: true, force: true });

        throw error;
    }
}

/** Generates a temporary project through the DAR CLI path, then compiles and runs its specs. */
export async function generateTemporaryProjectFromDarAsync(
    darPath: string,
    consumerSource?: string,
): Promise<GeneratedTemporaryProject> {
    buildSdkOrThrow();

    const archiveBytes = await readFile(darPath);

    const project = await new DamlInterfaceGenerator().generateFromDarOrThrowAsync(archiveBytes);

    const directory = await mkdtemp(join(tmpdir(), "daml-generated-project-"));

    try {
        const exitCode = await new DamlInterfaceCli().runAsync([
            "--input", darPath,
            "--output", directory,
        ]);

        if (exitCode !== 0) {
            throw new Error(`DAML interface CLI failed with exit code ${exitCode}`);
        }

        return await finalizeTemporaryProjectAsync(directory, project, consumerSource);
    } catch (error) {
        await rm(directory, { recursive: true, force: true });

        throw error;
    }
}

/** Generates a CommonJS project whose extensionless source imports execute through plain ts-node. */
export async function generateTsNodeTemporaryProjectAsync(
    archiveBytes: Uint8Array,
): Promise<GeneratedTemporaryProject> {
    buildSdkOrThrow();

    const project = await new DamlInterfaceGenerator(
        new DamlInterfaceGeneratorOptions({ moduleImportStyle: "ts-node" }),
    ).generateFromDalfOrThrowAsync(archiveBytes);

    const directory = await mkdtemp(join(tmpdir(), "daml-generated-ts-node-project-"));

    try {
        await new DamlInterfaceWriter().writeProjectAsync(project, directory);

        return await finalizeTsNodeTemporaryProjectAsync(directory, project);
    } catch (error) {
        await rm(directory, { recursive: true, force: true });

        throw error;
    }
}

/** Generates a DAR project through the ts-node CLI path and executes its source through plain ts-node. */
export async function generateTsNodeTemporaryProjectFromDarAsync(
    darPath: string,
): Promise<GeneratedTemporaryProject> {
    buildSdkOrThrow();

    const archiveBytes = await readFile(darPath);

    const project = await new DamlInterfaceGenerator(
        new DamlInterfaceGeneratorOptions({ moduleImportStyle: "ts-node" }),
    ).generateFromDarOrThrowAsync(archiveBytes);

    const directory = await mkdtemp(join(tmpdir(), "daml-generated-ts-node-project-"));

    try {
        const exitCode = await new DamlInterfaceCli().runAsync([
            "--input", darPath,
            "--output", directory,
            "--module-import-style", "ts-node",
        ]);

        if (exitCode !== 0) {
            throw new Error(`DAML interface CLI failed with exit code ${exitCode}`);
        }

        return await finalizeTsNodeTemporaryProjectAsync(directory, project);
    } catch (error) {
        await rm(directory, { recursive: true, force: true });

        throw error;
    }
}

export class GeneratedTemporaryProject {
    public constructor(
        public readonly directory: string,
        public readonly project: GeneratedDamlInterfaceProject,
        public readonly executedSpecPaths: readonly string[],
    ) {}

    public async disposeAsync(): Promise<void> {
        await rm(this.directory, { recursive: true, force: true });
    }
}

async function finalizeTemporaryProjectAsync(
    directory: string,
    project: GeneratedDamlInterfaceProject,
    consumerSource: string | undefined,
): Promise<GeneratedTemporaryProject> {
    await writeNodeNextProjectFiles(directory, consumerSource);
    await linkSdkPackage(directory);
    await assertGeneratedSpecCoverageOrThrow(directory, project);
    compileNodeNextProjectOrThrow(directory);

    const executedSpecPaths = await executeCompiledGeneratedSpecsOrThrow(directory);

    return new GeneratedTemporaryProject(directory, project, executedSpecPaths);
}

async function finalizeTsNodeTemporaryProjectAsync(
    directory: string,
    project: GeneratedDamlInterfaceProject,
): Promise<GeneratedTemporaryProject> {
    await writeCommonJsTsNodeProjectFiles(directory);
    await linkSdkPackage(directory);
    await assertGeneratedSpecCoverageOrThrow(directory, project);
    requireGeneratedTsNodeSourcesOrThrow(directory, project);

    const executedSpecPaths = executeTsNodeGeneratedSpecsOrThrow(directory, project);

    return new GeneratedTemporaryProject(directory, project, executedSpecPaths);
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
        include: ["generated/**/*.ts", "generated/**/*.spec.ts", "consumer.ts"],
    }, undefined, 2));
    await writeFile(join(directory, "consumer.ts"), consumerSource ?? "export {};\n");
}

async function writeCommonJsTsNodeProjectFiles(directory: string): Promise<void> {
    await writeFile(join(directory, "package.json"), JSON.stringify({
        name: "generated-daml-interface-ts-node-integration-project",
        private: true,
        type: "commonjs",
        dependencies: {
            "@distrohelena/canton-typescript-sdk": `file:${process.cwd()}`,
        },
    }, undefined, 2));
    await writeFile(join(directory, "tsconfig.json"), JSON.stringify({
        compilerOptions: {
            target: "ES2022",
            module: "CommonJS",
            moduleResolution: "Node",
            strict: true,
            skipLibCheck: true,
            esModuleInterop: true,
            types: ["node"],
        },
        include: ["generated/**/*.ts", "generated/**/*.spec.ts"],
    }, undefined, 2));
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

    const nodeTypesDirectory = join(directory, "node_modules", "@types", "node");

    await mkdir(join(directory, "node_modules", "@types"), { recursive: true });
    await symlink(join(process.cwd(), "node_modules", "@types", "node"), nodeTypesDirectory, "dir");
}

async function assertGeneratedSpecCoverageOrThrow(
    directory: string,
    project: GeneratedDamlInterfaceProject,
): Promise<void> {
    const expectedSpecPaths = project.productionFiles
        .map((file) => file.path.replace(/\.ts$/, ".spec.ts"))
        .sort();

    const emittedSpecPaths = (await findPathsRecursivelyAsync(join(directory, "generated")))
        .filter((path) => path.endsWith(".spec.ts"))
        .map((path) => path.slice(directory.length + 1))
        .sort();

    if (expectedSpecPaths.length !== project.specFiles.length
        || expectedSpecPaths.some((path, index) => path !== project.specFiles.map((file) => file.path).sort()[index])
        || expectedSpecPaths.length !== emittedSpecPaths.length
        || expectedSpecPaths.some((path, index) => path !== emittedSpecPaths[index])) {
        throw new Error("Generated project must emit exactly one sibling .spec.ts file for every production module.");
    }
}

async function executeCompiledGeneratedSpecsOrThrow(directory: string): Promise<readonly string[]> {
    const specPaths = (await findPathsRecursivelyAsync(join(directory, "dist", "generated")))
        .filter((path) => path.endsWith(".spec.js"))
        .sort();

    if (specPaths.length === 0) {
        throw new Error("Generated project did not compile any .spec.js files.");
    }

    try {
        execFileSync(process.execPath, ["--test", ...specPaths], {
            cwd: directory,
            stdio: "pipe",
        });
    } catch (error) {
        const failure = error as { readonly stderr?: Buffer; readonly stdout?: Buffer };

        throw new Error([
            "Generated DAML specs failed.",
            failure.stdout?.toString("utf8") ?? "",
            failure.stderr?.toString("utf8") ?? "",
        ].join("\n"));
    }

    return Object.freeze(specPaths);
}

function requireGeneratedTsNodeSourcesOrThrow(
    directory: string,
    project: GeneratedDamlInterfaceProject,
): void {
    const sourcePaths = [
        project.indexFile?.path,
        ...project.templateFiles.map((file) => file.path),
    ].filter((path): path is string => path !== undefined).map((path) => join(directory, path));

    try {
        execFileSync(process.execPath, [
            "-r", getTsNodeRegisterPath(),
            "-e", "for (const sourcePath of process.argv.slice(1)) require(sourcePath);",
            ...sourcePaths,
        ], {
            cwd: directory,
            // This fixture deliberately uses CommonJS and Node resolution to exercise runtime require() exports.
            // The SDK publishes ESM-only declarations, so normal ts-node instead fails TS2307; NodeNext compilation validates types.
            env: { ...process.env, TS_NODE_TRANSPILE_ONLY: "true" },
            stdio: "pipe",
        });
    } catch (error) {
        throw sourceExecutionError("Generated DAML ts-node sources failed to load.", error);
    }
}

function executeTsNodeGeneratedSpecsOrThrow(
    directory: string,
    project: GeneratedDamlInterfaceProject,
): readonly string[] {
    const specPaths = project.specFiles.map((file) => join(directory, file.path)).sort();

    if (specPaths.length === 0) {
        throw new Error("Generated project did not emit any .spec.ts files.");
    }

    try {
        execFileSync(process.execPath, [
            "-r", getTsNodeRegisterPath(),
            "--test",
            ...specPaths,
        ], {
            cwd: directory,
            // This fixture deliberately uses CommonJS and Node resolution to exercise runtime require() exports.
            // The SDK publishes ESM-only declarations, so normal ts-node instead fails TS2307; NodeNext compilation validates types.
            env: { ...process.env, TS_NODE_TRANSPILE_ONLY: "true" },
            stdio: "pipe",
        });
    } catch (error) {
        throw sourceExecutionError("Generated DAML ts-node specs failed.", error);
    }

    return Object.freeze(specPaths);
}

function getTsNodeRegisterPath(): string {
    return join(process.cwd(), "node_modules", "ts-node", "register");
}

function sourceExecutionError(message: string, error: unknown): Error {
    const failure = error as { readonly stderr?: Buffer; readonly stdout?: Buffer };

    return new Error([
        message,
        failure.stdout?.toString("utf8") ?? "",
        failure.stderr?.toString("utf8") ?? "",
    ].join("\n"));
}

async function findPathsRecursivelyAsync(directory: string): Promise<readonly string[]> {
    const entries = await readdir(directory, { withFileTypes: true });

    const paths = await Promise.all(entries.map(async (entry) => {
        const path = join(directory, entry.name);

        return entry.isDirectory()
            ? findPathsRecursivelyAsync(path)
            : [path];
    }));

    return paths.flat();
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
