import { readFileSync } from "node:fs";
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

describe("protobuf RPC disposition inventory", () => {
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
        for (const entry of readInventory().filter(
            (candidate) => candidate.disposition === "direct-rpc",
        )) {
            expect(entry.serviceRpc, entry.method).not.toBe("");
            expect(entry.generatedRequest, entry.method).not.toBe("");
            expect(entry.generatedResponse, entry.method).not.toBe("");
            expect(entry.grpcOperation, entry.method).not.toBe("");
            expect(entry.testPath, entry.method).not.toBe("");

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
