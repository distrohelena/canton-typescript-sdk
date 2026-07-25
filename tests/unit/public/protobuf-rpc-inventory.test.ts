import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Disposition = "direct-rpc" | "high-level" | "removed";

interface InventoryEntry {
    readonly surface: "ITransport" | "GrpcOperations";
    readonly method: string;
    readonly serviceRpc: string;
    readonly generatedRequest: string;
    readonly generatedResponse: string;
    readonly disposition: Disposition;
    readonly grpcOperation: string;
    readonly grpcException?: string;
    readonly json: {
        readonly status: "supported" | "unsupported";
        readonly endpoint?: string;
        readonly projection?: string;
        readonly reconstruction?: string;
        readonly error?: string;
    };
    readonly testPath: string;
}

function methodsIn(sourcePath: string, interfaceName: string): string[] {
    const source = readFileSync(resolve(process.cwd(), sourcePath), "utf8");
    const body = source.match(new RegExp(`export interface ${interfaceName} \\{([\\s\\S]*?)\\n\\}`));

    if (!body) throw new Error(`Could not find ${interfaceName}`);

    return [...body[1].matchAll(/^    ([a-zA-Z][a-zA-Z0-9]*Async)\??\(/gm)].map(
        ([, method]) => method,
    );
}

function readInventory(): InventoryEntry[] {
    const document = readFileSync(
        resolve(process.cwd(), "docs/protobuf-rpc-inventory.md"),
        "utf8",
    );
    const match = document.match(/```json\n([\s\S]*?)\n```/);

    if (!match) throw new Error("Inventory must contain a JSON code block");

    const parsed: unknown = JSON.parse(match[1]);

    if (!Array.isArray(parsed)) throw new Error("Inventory JSON must be an array");

    return parsed as InventoryEntry[];
}

function entriesFor(
    entries: readonly InventoryEntry[],
    surface: InventoryEntry["surface"],
): Map<string, InventoryEntry[]> {
    const grouped = new Map<string, InventoryEntry[]>();

    for (const entry of entries.filter((candidate) => candidate.surface === surface)) {
        grouped.set(entry.method, [...(grouped.get(entry.method) ?? []), entry]);
    }

    return grouped;
}

function generatedExportExists(identity: string): boolean {
    const [sourcePath, symbol] = identity.split("#");

    const sourceFile = sourcePath?.replace(/\.js$/, ".ts");

    if (!sourceFile || !symbol || !existsSync(resolve(process.cwd(), sourceFile))) {
        return false;
    }

    const source = readFileSync(resolve(process.cwd(), sourceFile), "utf8");

    if (new RegExp(`export (?:interface|class|const) ${symbol}(?:\\s|=|<)`).test(source)) {
        return true;
    }

    // Some generated service modules import message types from their protobuf
    // module rather than re-exporting them. They still resolve to a generated
    // identity and are valid inventory references.
    return new RegExp(`import(?: type)? \\{ ${symbol} \\} from "\\.\\.[^"]+"`).test(source);
}

function generatedSignatureFor(serviceRpc: string): {
    request: string;
    response: string;
} {
    const [service, rpc] = serviceRpc.split(".");
    const factoryPath = "src/transports/grpc/grpc-channel-factory.ts";
    const factory = readFileSync(resolve(process.cwd(), factoryPath), "utf8");
    const dependency = factory.match(
        new RegExp(`${service}\\?: Pick<\\s*([A-Za-z0-9_]+)`),
    )?.[1];

    if (!dependency) throw new Error(`No generated client dependency for ${service}`);

    const importMatch = [...factory.matchAll(
        /import\s*\{([\s\S]*?)\}\s*from\s*"([^"]+)";/g,
    )].find((candidate) =>
        candidate[1].split(",").some((item) =>
            item.trim().replace(/\s+/g, " ").split(" as ").at(-1) === dependency,
        ),
    );

    if (!importMatch) throw new Error(`No import for ${dependency}`);

    const clientPath = resolve(
        process.cwd(),
        "src/transports/grpc",
        importMatch[2].replace(/^\.\//, "").replace(/\.js$/, ".ts"),
    );
    const client = readFileSync(clientPath, "utf8");
    const signature = client.match(new RegExp(
        `${rpc}\\(input: ([A-Za-z0-9_]+),[^)]*\\): (?:UnaryCall|ServerStreamingCall|ClientStreamingCall)<[^,]+, ([A-Za-z0-9_]+)>`,
    )) ?? client.match(new RegExp(
        `${rpc}\\(options[^)]*\\): (?:UnaryCall|ServerStreamingCall|ClientStreamingCall)<([A-Za-z0-9_]+), ([A-Za-z0-9_]+)>`,
    ));

    if (!signature) throw new Error(`No generated signature for ${serviceRpc}`);

    const modulePath = clientPath
        .replace(resolve(process.cwd()) + "/", "")
        .replace(/\.client\.ts$/, ".ts");

    return {
        request: `${modulePath}#${signature[1]}`,
        response: `${modulePath}#${signature[2]}`,
    };
}

describe("protobuf RPC disposition inventory", () => {
    it("derives health RPC types instead of accepting Update types", () => {
        expect(generatedSignatureFor("healthClient.check")).toEqual({
            request: "src/transports/grpc/generated/canton/google/grpc/health/v1/health.ts#HealthCheckRequest",
            response: "src/transports/grpc/generated/canton/google/grpc/health/v1/health.ts#HealthCheckResponse",
        });
    });

    it("classifies every ITransport and GrpcOperations method exactly once", () => {
        const entries = readInventory();

        for (const [surface, methods] of [
            ["ITransport", methodsIn("src/core/transports/transport.interface.ts", "ITransport")],
            ["GrpcOperations", methodsIn("src/transports/grpc/grpc-channel-factory.ts", "GrpcOperations")],
        ] as const) {
            const byMethod = entriesFor(entries, surface);

            expect([...byMethod.keys()].sort()).toEqual([...methods].sort());

            for (const method of methods) {
                const classified = byMethod.get(method) ?? [];

                expect(classified, `${surface}.${method}`).toHaveLength(1);
                expect(["direct-rpc", "high-level", "removed"]).toContain(
                    classified[0].disposition,
                );
            }
        }
    });

    it("documents complete generated and JSON adapter contracts for direct RPCs", () => {
        const grpcFactory = readFileSync(
            resolve(process.cwd(), "src/transports/grpc/grpc-channel-factory.ts"),
            "utf8",
        );

        for (const entry of readInventory().filter(
            (candidate) => candidate.disposition === "direct-rpc",
        )) {
            expect(entry.serviceRpc, entry.method).not.toBe("");
            expect(entry.generatedRequest, entry.method).not.toBe("");
            expect(entry.generatedResponse, entry.method).not.toBe("");
            expect(entry.grpcOperation, entry.method).not.toBe("");
            expect(entry.testPath, entry.method).not.toBe("");
            expect(existsSync(resolve(process.cwd(), entry.testPath)), entry.method).toBe(true);
            expect(generatedExportExists(entry.generatedRequest), entry.method).toBe(true);
            expect(generatedExportExists(entry.generatedResponse), entry.method).toBe(true);

            if (!entry.grpcException) {
                expect(entry.grpcOperation).toMatch(/^GrpcOperations\.[A-Za-z][A-Za-z0-9]*Async$/);
                expect(methodsIn(
                    "src/transports/grpc/grpc-channel-factory.ts",
                    "GrpcOperations",
                )).toContain(entry.grpcOperation.slice("GrpcOperations.".length));
                const [service, rpc] = entry.serviceRpc.split(".");
                expect(grpcFactory, entry.method).toContain(`${service}.${rpc}(`);
                expect(generatedSignatureFor(entry.serviceRpc), entry.method).toEqual({
                    request: entry.generatedRequest.replace(/\.js#/, ".ts#"),
                    response: entry.generatedResponse.replace(/\.js#/, ".ts#"),
                });
            }

            if (entry.json.status === "supported") {
                expect(entry.json.endpoint, entry.method).toBeTruthy();
                expect(entry.json.projection, entry.method).toBeTruthy();
                expect(entry.json.reconstruction, entry.method).toBeTruthy();
            } else {
                expect(entry.json.status, entry.method).toBe("unsupported");
                expect(entry.json.error, entry.method).toBeTruthy();
            }
        }
    });
});
