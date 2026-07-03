import {
    mkdirSync,
    readFileSync,
    readdirSync,
    rmSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const workspaceRoot = process.cwd();
const outputRoot = resolve(
    workspaceRoot,
    "src/transports/grpc/generated/canton",
);

const includeRoots = [
    resolve(
        workspaceRoot,
        "proto/canton/community/admin-api/src/main/protobuf",
    ),
    resolve(workspaceRoot, "proto/canton/community/base/src/main/protobuf"),
    resolve(
        workspaceRoot,
        "proto/canton/community/synchronizer/src/main/protobuf",
    ),
    resolve(
        workspaceRoot,
        "proto/canton/community/ledger-api-proto/src/main/protobuf",
    ),
    resolve(
        workspaceRoot,
        "proto/canton/community/ledger/ledger-api-core/src/main/protobuf",
    ),
    resolve(
        workspaceRoot,
        "proto/canton/community/participant/src/main/protobuf",
    ),
    resolve(
        workspaceRoot,
        "proto/canton/community/daml-lf/archive/src/main/protobuf",
    ),
    resolve(
        workspaceRoot,
        "proto/canton/community/daml-lf/transaction/src/main/protobuf",
    ),
    resolve(
        workspaceRoot,
        "proto/canton/community/daml-lf/ledger-api-value-proto/src/main/protobuf",
    ),
    resolve(workspaceRoot, "proto"),
];

function collectProtoFiles(rootPath) {
    const filePaths = [];

    for (const entry of readdirSync(rootPath)) {
        const absolutePath = join(rootPath, entry);
        const stats = statSync(absolutePath);

        if (stats.isDirectory()) {
            filePaths.push(...collectProtoFiles(absolutePath));
            continue;
        }

        if (absolutePath.endsWith(".proto")) {
            filePaths.push(absolutePath);
        }
    }

    return filePaths;
}

function normalizeGeneratedImports(rootPath) {
    for (const entry of readdirSync(rootPath)) {
        const absolutePath = join(rootPath, entry);
        const stats = statSync(absolutePath);

        if (stats.isDirectory()) {
            normalizeGeneratedImports(absolutePath);
            continue;
        }

        if (!absolutePath.endsWith(".ts")) {
            continue;
        }

        const source = readFileSync(absolutePath, "utf8");
        const normalized = source
            .replaceAll(
                /from "(\.[^"]*?)(?<!\.js)"/g,
                (_match, importPath) => `from "${importPath}.js"`,
            )
            .replaceAll(
                /from '(\.[^']*?)(?<!\.js)'/g,
                (_match, importPath) => `from '${importPath}.js'`,
            )
            .replaceAll(
                /import\("(\.[^"]*?)(?<!\.js)"\)/g,
                (_match, importPath) => `import("${importPath}.js")`,
            )
            .replaceAll(
                /import\('(\.[^']*?)(?<!\.js)'\)/g,
                (_match, importPath) => `import('${importPath}.js')`,
            );

        if (normalized !== source) {
            writeFileSync(absolutePath, normalized);
        }
    }
}

function getVirtualProtoPath(filePath) {
    const includeRoot = includeRoots.find((candidate) =>
        filePath.startsWith(`${candidate}/`),
    );

    if (!includeRoot) {
        throw new Error(`No proto include root matched '${filePath}'.`);
    }

    return relative(includeRoot, filePath).replaceAll("\\", "/");
}

const protoFiles = Array.from(
    new Set(
        [
            ...collectProtoFiles(resolve(workspaceRoot, "proto/canton")),
            ...collectProtoFiles(resolve(workspaceRoot, "proto/google")),
        ].map((filePath) => getVirtualProtoPath(filePath)),
    ),
).sort();

rmSync(outputRoot, { force: true, recursive: true });
mkdirSync(outputRoot, { recursive: true });

const result = spawnSync(
    "npx",
    [
        "protoc",
        ...includeRoots.flatMap((includeRoot) => [
            "--proto_path",
            includeRoot,
        ]),
        "--ts_out",
        outputRoot,
        "--ts_opt",
        [
            "force_server_none",
            "force_optimize_code_size",
            "long_type_string",
        ].join(","),
        ...protoFiles,
    ],
    {
        cwd: workspaceRoot,
        stdio: "inherit",
    },
);

if (result.status !== 0) {
    process.exit(result.status ?? 1);
}

normalizeGeneratedImports(outputRoot);
