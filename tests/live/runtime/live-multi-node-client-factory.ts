import { CantonClient } from "../../../src/index.js";
import { createLiveClient } from "./live-client-factory.js";
import { LiveMultiNodeEnvironment } from "./live-multi-node-test-environment.js";

export interface LiveMultiNodeClients {
    readonly primary: CantonClient;
    readonly secondary?: CantonClient;
    readonly tertiary?: CantonClient;
    readonly all: readonly CantonClient[];
}

export function createLiveMultiNodeClients(
    environment: LiveMultiNodeEnvironment,
): LiveMultiNodeClients {
    const all = environment.nodes.map((node) => createLiveClient(node));

    return {
        primary: all[0],
        secondary: all[1],
        tertiary: all[2],
        all,
    };
}

export async function disposeLiveMultiNodeClientsAsync(
    clients: LiveMultiNodeClients | undefined,
): Promise<void> {
    if (clients === undefined) {
        return;
    }

    await Promise.all(clients.all.map((client) => client.disposeAsync()));
}
