import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const executeFileAsync = promisify(execFile);
const expectedExportKeys = [
    ".",
    "./grpc",
    "./protobuf",
    "./json",
    "./daml-lf",
    "./daml-interface",
    "./testing",
];
const expectedLocalnetBinEntries = Object.freeze({
    "canton-localnet-start": "node/start-local.sh",
    "canton-localnet-stop": "node/stop-local.sh",
    "canton-localnet-participant-358-start": "node/start-local-participant-358.sh",
    "canton-localnet-participant-358-stop": "node/stop-local-participant-358.sh",
});
const requiredLocalnetPackedPaths = Object.freeze([
    "package/node/start-local.sh",
    "package/node/stop-local.sh",
    "package/node/start-local-participant-358.sh",
    "package/node/stop-local-participant-358.sh",
    "package/node/test-start-local.sh",
    "package/node/test-stop-local.sh",
    "package/node/test-participant-358-sidecar.sh",
    "package/node/test-participant-358-sidecar-smoke.sh",
    "package/node/es256-jwt.mjs",
    "package/node/participant-358-synchronizer.mjs",
]);
const helpText =
    "Runs npm package verification against the packed tarball surface.";
const submitCommandsExportNames = Object.freeze({
    request: "SubmitCommandsRequest",
    commands: "NonEmptyLedgerCommands",
    removedRequest: "Submit" + "CommandRequest",
    removedModule: ["submit", "command", "request"].join("-"),
});

export function getHelpText() {
    return helpText;
}

export function getExpectedExportKeys() {
    return [...expectedExportKeys];
}

export function getExpectedLocalnetBinEntries() {
    return { ...expectedLocalnetBinEntries };
}

export function getExpectedSubmitCommandsExportNames() {
    return { ...submitCommandsExportNames };
}

export function createNpmPackArguments(
    cacheDirectoryPath,
    packDestinationPath,
) {
    return [
        "pack",
        "--json",
        "--cache",
        cacheDirectoryPath,
        "--pack-destination",
        packDestinationPath,
    ];
}

export function getPackedTarballFileName(packageName, packageVersion) {
    const normalizedPackageName = packageName.replace(/^@/, "").replace("/", "-");

    return `${normalizedPackageName}-${packageVersion}.tgz`;
}

export function isAllowedPackedPath(value) {
    if (requiredLocalnetPackedPaths.includes(value)) {
        return true;
    }

    if (value.startsWith("package/dist/src/")) {
        return false;
    }

    if (value.startsWith("package/dist/tests/")) {
        return false;
    }

    if (value.startsWith("package/dist/docs/")) {
        return false;
    }

    if (value.startsWith("package/dist/node/")) {
        return false;
    }

    if (value.startsWith("package/dist/scripts/")) {
        return false;
    }

    return (
        value === "package/" ||
        value === "package/LICENSE" ||
        value === "package/README.md" ||
        value === "package/package.json" ||
        value.startsWith("package/dist/")
    );
}

async function runCommandAsync(command, argumentsList) {
    const result = await executeFileAsync(command, argumentsList, {
        cwd: process.cwd(),
    });

    return result.stdout;
}

async function runBashCommandAsync(commandText, argumentValues) {
    const result = await executeFileAsync(
        "bash",
        ["-lc", commandText, ...argumentValues],
        {
            cwd: process.cwd(),
        },
    );

    return result.stdout;
}

async function getPackedTarballPathAsync() {
    const cacheDirectoryPath = join(tmpdir(), "canton-typescript-sdk-npm-cache");
    const packDestinationPath = await mkdtemp(
        join(tmpdir(), "canton-typescript-sdk-pack-"),
    );
    const packageJsonPath = new URL("../package.json", import.meta.url);
    const packageJsonContent = await readFile(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonContent);
    const tarballFileName = getPackedTarballFileName(
        packageJson.name,
        packageJson.version,
    );

    await runCommandAsync("npm", ["run", "build"]);

    await runBashCommandAsync(
        "npm pack --json --cache \"$0\" --pack-destination \"$1\" >/dev/null",
        [cacheDirectoryPath, packDestinationPath],
    );

    return {
        packDestinationPath,
        tarballPath: resolve(packDestinationPath, tarballFileName),
    };
}

async function getTarEntriesAsync(tarballPath) {
    const output = await runCommandAsync("tar", ["-tf", tarballPath]);

    return output
        .split("\n")
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
}

async function readPackedPackageJsonAsync(tarballPath) {
    const output = await runCommandAsync("tar", [
        "-xOf",
        tarballPath,
        "package/package.json",
    ]);

    return JSON.parse(output);
}

async function validateProtobufExportAsync(tarballPath, destinationPath) {
    const unpackedPath = join(destinationPath, "unpacked");
    const packagePath = join(unpackedPath, "package");
    const consumerPath = join(unpackedPath, "consumer");
    const packageLinkPath = join(
        consumerPath,
        "node_modules/@distrohelena/canton-typescript-sdk",
    );

    await mkdir(unpackedPath, { recursive: true });
    await runCommandAsync("tar", ["-xf", tarballPath, "-C", unpackedPath]);
    await mkdir(join(consumerPath, "node_modules/@distrohelena"), {
        recursive: true,
    });
    await symlink(packagePath, packageLinkPath, "dir");
    await symlink(resolve(process.cwd(), "node_modules"), join(packagePath, "node_modules"), "dir");

    await executeFileAsync(
        "node",
        [
            "--input-type=module",
            "--eval",
            [
                'import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";',
                "const request = ledgerApiV2.GetUpdateByIdRequest.create();",
                'if (request === undefined) throw new Error("protobuf create() returned undefined");',
            ].join("\n"),
        ],
        { cwd: consumerPath },
    );
}

async function validateSubmitCommandsExportAsync(tarballPath, destinationPath) {
    const declaration = await runCommandAsync("tar", [
        "-xOf",
        tarballPath,
        "package/dist/index.d.ts",
    ]);

    for (const requiredName of [
        submitCommandsExportNames.request,
        submitCommandsExportNames.commands,
    ]) {
        if (!declaration.includes(requiredName)) {
            throw new Error(`Packed declarations are missing ${requiredName}.`);
        }
    }

    if (
        declaration.includes(submitCommandsExportNames.removedRequest) ||
        declaration.includes(submitCommandsExportNames.removedModule)
    ) {
        throw new Error("Packed declarations retain the removed command request surface.");
    }

    const unpackedPath = join(destinationPath, "submit-commands-unpacked");
    const packagePath = join(unpackedPath, "package");
    const consumerPath = join(unpackedPath, "consumer");
    const packageLinkPath = join(
        consumerPath,
        "node_modules/@distrohelena/canton-typescript-sdk",
    );

    await mkdir(unpackedPath, { recursive: true });
    await runCommandAsync("tar", ["-xf", tarballPath, "-C", unpackedPath]);
    await mkdir(join(consumerPath, "node_modules/@distrohelena"), {
        recursive: true,
    });
    await symlink(packagePath, packageLinkPath, "dir");
    await symlink(resolve(process.cwd(), "node_modules"), join(packagePath, "node_modules"), "dir");

    await executeFileAsync(
        "node",
        [
            "--input-type=module",
            "--eval",
            [
                'import * as sdk from "@distrohelena/canton-typescript-sdk";',
                `if (typeof sdk.${submitCommandsExportNames.request} !== "function") throw new Error("missing plural request runtime export");`,
                `if (${JSON.stringify(submitCommandsExportNames.removedRequest)} in sdk) throw new Error("removed request runtime export present");`,
            ].join("\n"),
        ],
        { cwd: consumerPath },
    );

    const typeConsumerPath = join(consumerPath, "submit-commands-consumer.ts");

    await writeFile(
        typeConsumerPath,
        'import { SubmitCommandsRequest } from "@distrohelena/canton-typescript-sdk";\nimport type { NonEmptyLedgerCommands } from "@distrohelena/canton-typescript-sdk";\ndeclare const commands: NonEmptyLedgerCommands;\nnew SubmitCommandsRequest({ applicationId: "app", actAs: ["Alice"], commands });\n',
    );
    await executeFileAsync(
        resolve(process.cwd(), "node_modules/.bin/tsc"),
        ["--noEmit", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--target", "ES2022", typeConsumerPath],
        { cwd: consumerPath },
    );
}

async function writeStdoutLineAsync(value) {
    await new Promise((resolve, reject) => {
        process.stdout.write(`${value}\n`, (error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

async function printHelpAsync() {
    await writeStdoutLineAsync(getHelpText());
}

function validateEntries(entries) {
    const disallowedEntries = entries.filter(
        (value) => !isAllowedPackedPath(value),
    );

    if (disallowedEntries.length > 0) {
        throw new Error(
            `Found unexpected packed files: ${disallowedEntries.join(", ")}`,
        );
    }

    const missingEntries = requiredLocalnetPackedPaths.filter(
        (value) => !entries.includes(value),
    );

    if (missingEntries.length > 0) {
        throw new Error(
            `Packed package is missing required localnet launcher files: ${missingEntries.join(", ")}`,
        );
    }
}

function validateExports(packageJson) {
    const actualExports =
        packageJson.exports !== null && typeof packageJson.exports === "object"
            ? Object.keys(packageJson.exports)
            : [];
    const missingExportKeys = expectedExportKeys.filter(
        (value) => !actualExports.includes(value),
    );

    if (missingExportKeys.length > 0) {
        throw new Error(
            `Packed package.json is missing export keys: ${missingExportKeys.join(", ")}`,
        );
    }
}

function validateLocalnetBinEntries(packageJson) {
    const actualBinEntries =
        packageJson.bin !== null && typeof packageJson.bin === "object"
            ? packageJson.bin
            : {};
    const actualKeys = Object.keys(actualBinEntries).sort();
    const expectedKeys = Object.keys(expectedLocalnetBinEntries).sort();
    const missingOrMismatchedEntries = expectedKeys.filter(
        (key) => actualBinEntries[key] !== expectedLocalnetBinEntries[key],
    );
    const unexpectedEntries = actualKeys.filter(
        (key) => !expectedKeys.includes(key),
    );

    if (
        missingOrMismatchedEntries.length > 0 ||
        unexpectedEntries.length > 0
    ) {
        throw new Error(
            `Packed package has invalid localnet bin entries: missing or mismatched ${missingOrMismatchedEntries.join(", ") || "none"}; unexpected ${unexpectedEntries.join(", ") || "none"}.`,
        );
    }
}

async function verifyPackAsync() {
    const packedTarball = await getPackedTarballPathAsync();

    try {
        const entries = await getTarEntriesAsync(packedTarball.tarballPath);
        const packedPackageJson = await readPackedPackageJsonAsync(
            packedTarball.tarballPath,
        );

        validateExports(packedPackageJson);
        validateLocalnetBinEntries(packedPackageJson);
        await validateProtobufExportAsync(
            packedTarball.tarballPath,
            packedTarball.packDestinationPath,
        );
        await validateSubmitCommandsExportAsync(
            packedTarball.tarballPath,
            packedTarball.packDestinationPath,
        );
        validateEntries(entries);

        await writeStdoutLineAsync(
            `Verified package verification for ${packedTarball.tarballPath}.`,
        );
        await writeStdoutLineAsync(`Checked ${entries.length} packed entries.`);
    } finally {
        await unlink(packedTarball.tarballPath).catch(() => undefined);
        await rm(packedTarball.packDestinationPath, {
            force: true,
            recursive: true,
        }).catch(() => undefined);
    }
}

async function mainAsync() {
    if (process.argv.includes("--help")) {
        await printHelpAsync();
        return;
    }

    await verifyPackAsync();
}

const scriptFilePath = fileURLToPath(import.meta.url);
const entryPointFilePath =
    process.argv[1] !== undefined ? resolve(process.argv[1]) : undefined;

if (entryPointFilePath === scriptFilePath) {
    await mainAsync();
}
