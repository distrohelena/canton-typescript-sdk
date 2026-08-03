import { describe, expect, it, vi } from "vitest";
import type { CantonManager } from "../../../src/index.js";
import {
    waitForLivePqsParityFixtureAsync,
} from "../../live/runtime/live-query-manager-factory.js";
import {
    assertDedicatedPruningEndpoints,
} from "../../live/runtime/live-query-pruning-fixture.js";

describe("live query runtime safety", () => {
    it("rejects a ledger endpoint that aliases a protected participant", () => {
        expect(() => assertDedicatedPruningEndpoints(
            {
                ledgerEndpoint: "https://127.0.0.1:3901/",
                ledgerAdminEndpoint: "localhost:6901",
            },
            [{
                ledgerEndpoint: "LOCALHOST:3901",
                ledgerAdminEndpoint: "http://localhost:3902",
            }],
        )).toThrow(/dedicated ledger endpoint/i);
    });

    it("rejects a ledger-admin URL spelling that aliases a protected participant", () => {
        expect(() => assertDedicatedPruningEndpoints(
            {
                ledgerEndpoint: "localhost:6901",
                ledgerAdminEndpoint: "HTTP://LOCALHOST:3902/",
            },
            [{
                ledgerEndpoint: "http://localhost:3902",
                ledgerAdminEndpoint: "localhost:4902",
            }],
        )).toThrow(/dedicated ledger-admin endpoint/i);
    });

    it("treats a scheme-less endpoint without a port as grpc default 443", () => {
        expect(() => assertDedicatedPruningEndpoints(
            {
                ledgerEndpoint: "localhost",
                ledgerAdminEndpoint: "localhost:6902",
            },
            [{
                ledgerEndpoint: "https://localhost",
                ledgerAdminEndpoint: "https://localhost:3902",
            }],
        )).toThrow(/dedicated ledger endpoint/i);
    });

    it("preserves an explicit port on a scheme-less endpoint", () => {
        expect(() => assertDedicatedPruningEndpoints(
            {
                ledgerEndpoint: "localhost:8443",
                ledgerAdminEndpoint: "localhost:6902",
            },
            [{
                ledgerEndpoint: "https://localhost",
                ledgerAdminEndpoint: "https://localhost:3902",
            }],
        )).not.toThrow();
    });

    it("rejects missing endpoints and accepts a fully isolated endpoint pair", () => {
        expect(() => assertDedicatedPruningEndpoints(
            {
                ledgerEndpoint: "localhost:6901",
                ledgerAdminEndpoint: undefined,
            },
            [{
                ledgerEndpoint: "localhost:3901",
                ledgerAdminEndpoint: "localhost:3902",
            }],
        )).toThrow(/ledger-admin endpoint/i);

        expect(() => assertDedicatedPruningEndpoints(
            {
                ledgerEndpoint: "localhost:6901",
                ledgerAdminEndpoint: "localhost:6902",
            },
            [{
                ledgerEndpoint: "localhost:3901",
                ledgerAdminEndpoint: "localhost:3902",
            }],
        )).not.toThrow();
    });

    it("waits for fixture contracts, relations, metadata, and watermark", async () => {
        const events = vi.fn()
            .mockResolvedValueOnce([])
            .mockResolvedValue([{ pk: "3" }]);

        const exerciseTypes = vi.fn()
            .mockResolvedValueOnce([])
            .mockResolvedValue([{ pk: "5" }]);

        const watermark = vi.fn()
            .mockResolvedValueOnce([{ offset: "41" }])
            .mockResolvedValue([{ offset: "42" }]);

        const manager = {
            query: {
                contracts: { findMany: vi.fn().mockResolvedValue([
                    { contractId: "active" },
                    { contractId: "archived" },
                ]) },
                exercises: { findMany: vi.fn().mockResolvedValue([
                    { contractId: "archived" },
                ]) },
                events: { findMany: events },
                transactions: { findMany: vi.fn().mockResolvedValue([
                    { ix: "2" },
                ]) },
                packages: { findMany: vi.fn().mockResolvedValue([
                    { id: "pkg" },
                ]) },
                contractTypes: { findMany: vi.fn().mockResolvedValue([
                    { pk: "4" },
                ]) },
                exerciseTypes: { findMany: exerciseTypes },
                watermark: { findMany: watermark },
            },
        } as unknown as CantonManager;

        await waitForLivePqsParityFixtureAsync(manager, {
            packageId: "pkg",
            templateId: {
                packageId: "pkg",
                moduleName: "Main",
                entityName: "Iou",
            },
            activeContractId: "active",
            archivedContractId: "archived",
            archivedAtOffset: "42",
        }, {
            timeoutMs: 100,
            intervalMs: 0,
        });

        expect(events).toHaveBeenCalledTimes(2);
        expect(manager.query.exercises.findMany).toHaveBeenCalledTimes(2);
        expect(exerciseTypes).toHaveBeenCalledTimes(2);
        expect(watermark).toHaveBeenCalledTimes(2);
    });
});
