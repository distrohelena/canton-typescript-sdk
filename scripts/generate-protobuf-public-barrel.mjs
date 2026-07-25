import {
    mkdirSync,
    readdirSync,
    readFileSync,
    writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

const workspaceRoot = process.cwd();
const generatedRoot = resolve(
    workspaceRoot,
    "src/transports/grpc/generated/canton",
);
const outputPath = resolve(workspaceRoot, "src/protobuf/index.ts");

const publicRoots = [
    { name: "ledgerApiV2", path: "com/daml/ledger/api/v2" },
    { name: "canton", path: "daml" },
    { name: "comDaml", path: "com/daml" },
    { name: "comDigitalasset", path: "com/digitalasset" },
    { name: "google", path: "google" },
];

function collectTypeScriptFiles(rootPath) {
    return readdirSync(rootPath, { withFileTypes: true })
        .flatMap((entry) => {
            const entryPath = join(rootPath, entry.name);
            if (entry.isDirectory()) {
                return collectTypeScriptFiles(entryPath);
            }
            return entry.isFile() && entry.name.endsWith(".ts")
                ? [entryPath]
                : [];
        })
        .sort();
}

function exportedSymbols(filePath) {
    const source = readFileSync(filePath, "utf8");
    const symbols = new Map();
    const declarationPattern =
        /^export\s+(interface|type|class|const|enum|function)\s+([A-Za-z_$][\w$]*)/gm;

    for (const match of source.matchAll(declarationPattern)) {
        const [, kind, name] = match;
        const symbol = symbols.get(name) ?? { type: false, value: false };
        symbol.type ||= ["interface", "type", "class", "enum"].includes(kind);
        symbol.value ||= ["class", "const", "enum", "function"].includes(kind);
        symbols.set(name, symbol);
    }

    return symbols;
}

function createNamespaceTree() {
    return { children: new Map(), modules: [] };
}

function addModule(root, directoryPath, module) {
    let current = root;
    for (const directory of directoryPath) {
        if (!/^[A-Za-z_$][\w$]*$/.test(directory)) {
            throw new Error(`Cannot use '${directory}' as a TypeScript namespace.`);
        }
        current.children.set(directory, current.children.get(directory) ?? createNamespaceTree());
        current = current.children.get(directory);
    }
    current.modules.push(module);
}

function renderNamespace(name, node, indent = "") {
    const lines = [`${indent}export namespace ${name} {`, ""];
    const symbolOwners = new Map();

    for (const module of node.modules) {
        for (const [symbolName, symbol] of module.symbols) {
            const owners = symbolOwners.get(symbolName) ?? [];
            owners.push(module);
            symbolOwners.set(symbolName, owners);
        }
    }

    const collidingModules = new Set(
        [...symbolOwners.values()]
            .filter((owners) => owners.length > 1)
            .flat(),
    );

    for (const module of node.modules.filter(
        (candidate) => !collidingModules.has(candidate),
    )) {
        for (const [symbolName, symbol] of module.symbols) {
            if (symbol.type) {
                lines.push(`${indent}    export type ${symbolName} = ${module.alias}.${symbolName};`);
                lines.push("");
            }
            if (symbol.value) {
                lines.push(`${indent}    export const ${symbolName} = ${module.alias}.${symbolName};`);
                lines.push("");
            }
        }
    }

    for (const module of node.modules.filter((candidate) => collidingModules.has(candidate))) {
        const moduleName = module.importPath
            .split("/")
            .at(-1)
            .replace(/\.js$/, "")
            .replaceAll(".", "_");
        lines.push(`${indent}    export namespace ${moduleName} {`);
        lines.push("");
        for (const [symbolName, symbol] of module.symbols) {
            if (symbol.type) {
                lines.push(`${indent}        export type ${symbolName} = ${module.alias}.${symbolName};`);
                lines.push("");
            }
            if (symbol.value) {
                lines.push(`${indent}        export const ${symbolName} = ${module.alias}.${symbolName};`);
                lines.push("");
            }
        }
        lines.push(`${indent}    }`);
    }

    for (const [childName, child] of [...node.children].sort(([left], [right]) => left.localeCompare(right))) {
        lines.push(renderNamespace(childName, child, `${indent}    `));
    }

    lines.push(`${indent}}`);
    return lines.join("\n");
}

const imports = [];
const rootTrees = new Map(publicRoots.map(({ name }) => [name, createNamespaceTree()]));

for (const publicRoot of publicRoots) {
    const sourceRoot = join(generatedRoot, publicRoot.path);
    for (const filePath of collectTypeScriptFiles(sourceRoot)) {
        const sourceRelativePath = relative(generatedRoot, filePath).replaceAll("\\", "/");
        const publicRelativePath = relative(sourceRoot, filePath)
            .replace(/\.ts$/, "")
            .split("/");
        const fileName = publicRelativePath.pop();
        const alias = `generated_${imports.length.toString().padStart(4, "0")}`;
        const importPath = `../transports/grpc/generated/canton/${sourceRelativePath.replace(/\.ts$/, ".js")}`;
        const module = { alias, importPath, symbols: exportedSymbols(filePath) };

        imports.push(`import * as ${alias} from "${importPath}";`);
        addModule(rootTrees.get(publicRoot.name), publicRelativePath, module);
    }
}

mkdirSync(resolve(workspaceRoot, "src/protobuf"), { recursive: true });
writeFileSync(
    outputPath,
    [
        "// This file is generated by scripts/generate-protobuf-public-barrel.mjs.",
        "// Do not edit it manually.",
        "",
        ...imports,
        "",
        ...publicRoots.map(({ name }) => renderNamespace(name, rootTrees.get(name))),
        "",
    ].join("\n"),
);
