import { afterEach, describe, expect, it, vi } from "vitest";
import { TransportKind } from "../../../src/index.js";
import {
    createLiveNodeClientOptions,
} from "../../live/runtime/live-test-environment.js";
import {
    createLiveMultiNodeEnvironment,
    getConfiguredLiveMultiNodeCount,
} from "../../live/runtime/live-multi-node-test-environment.js";
import {
    createLiveMultiNodeClients,
    disposeLiveMultiNodeClientsAsync,
} from "../../live/runtime/live-multi-node-client-factory.js";
import { createLiveClient } from "../../live/runtime/live-client-factory.js";

vi.mock("../../live/runtime/live-client-factory.js", () => ({
    createLiveClient: vi.fn(),
}));

describe("live multi-node runtime", () => {
    afterEach(() => {
        vi.resetAllMocks();
        delete process.env.SDK_TEST_QUATERNARY_LEDGER_ENDPOINT;
        delete process.env.SDK_TEST_QUATERNARY_LEDGER_ADMIN_ENDPOINT;
        delete process.env.SDK_TEST_QUATERNARY_PARTICIPANT_ADMIN_ENDPOINT;
        delete process.env.SDK_TEST_QUINARY_LEDGER_ENDPOINT;
        delete process.env.SDK_TEST_QUINARY_LEDGER_ADMIN_ENDPOINT;
        delete process.env.SDK_TEST_QUINARY_PARTICIPANT_ADMIN_ENDPOINT;
    });

    it("defaults the live multi-node runtime to five nodes", () => {
        const environment = createLiveMultiNodeEnvironment({
            transportKind: TransportKind.grpc,
        });

        expect(getConfiguredLiveMultiNodeCount()).toBe(5);
        expect(environment.nodes).toHaveLength(5);
        expect(environment.nodes[3].options.ledgerEndpoint).toBe(
            "http://localhost:6901",
        );
        expect(environment.nodes[3].options.participantAdminEndpoint).toBe(
            "http://localhost:6902",
        );
        expect(environment.nodes[4].options.ledgerEndpoint).toBe(
            "http://localhost:7901",
        );
        expect(environment.nodes[4].options.participantAdminEndpoint).toBe(
            "http://localhost:7902",
        );
    });

    it("honors quaternary and quinary endpoint environment overrides", () => {
        process.env.SDK_TEST_QUATERNARY_LEDGER_ENDPOINT =
            "http://override-fourth-ledger:6901";
        process.env.SDK_TEST_QUATERNARY_LEDGER_ADMIN_ENDPOINT =
            "http://override-fourth-admin:6901";
        process.env.SDK_TEST_QUATERNARY_PARTICIPANT_ADMIN_ENDPOINT =
            "http://override-fourth-participant:6902";
        process.env.SDK_TEST_QUINARY_LEDGER_ENDPOINT =
            "http://override-fifth-ledger:7901";
        process.env.SDK_TEST_QUINARY_LEDGER_ADMIN_ENDPOINT =
            "http://override-fifth-admin:7901";
        process.env.SDK_TEST_QUINARY_PARTICIPANT_ADMIN_ENDPOINT =
            "http://override-fifth-participant:7902";

        const quaternary = createLiveNodeClientOptions({
            transportKind: TransportKind.grpc,
            nodeIndex: 3,
        });
        const quinary = createLiveNodeClientOptions({
            transportKind: TransportKind.grpc,
            nodeIndex: 4,
        });

        expect(quaternary.ledgerEndpoint).toBe(
            "http://override-fourth-ledger:6901",
        );
        expect(quaternary.ledgerAdminEndpoint).toBe(
            "http://override-fourth-admin:6901",
        );
        expect(quaternary.participantAdminEndpoint).toBe(
            "http://override-fourth-participant:6902",
        );
        expect(quinary.ledgerEndpoint).toBe(
            "http://override-fifth-ledger:7901",
        );
        expect(quinary.ledgerAdminEndpoint).toBe(
            "http://override-fifth-admin:7901",
        );
        expect(quinary.participantAdminEndpoint).toBe(
            "http://override-fifth-participant:7902",
        );
    });

    it("exposes quaternary and quinary live clients", async () => {
        const fakeClients = Array.from({ length: 5 }, (_, index) => ({
            name: `client-${index + 1}`,
            disposeAsync: vi.fn(async () => undefined),
        }));

        vi.mocked(createLiveClient).mockImplementation((() => {
            let index = 0;

            return () => fakeClients[index++] as never;
        })());

        const environment = createLiveMultiNodeEnvironment({
            transportKind: TransportKind.grpc,
        });
        const clients = createLiveMultiNodeClients(environment);

        expect(clients.primary).toBe(fakeClients[0]);
        expect(clients.secondary).toBe(fakeClients[1]);
        expect(clients.tertiary).toBe(fakeClients[2]);
        expect(clients.quaternary).toBe(fakeClients[3]);
        expect(clients.quinary).toBe(fakeClients[4]);
        expect(clients.all).toHaveLength(5);

        await disposeLiveMultiNodeClientsAsync(clients as never);

        for (const client of fakeClients) {
            expect(client.disposeAsync).toHaveBeenCalledTimes(1);
        }
    });
});
