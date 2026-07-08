import {
    GetParticipantIdRequest,
    GetParticipantStatusRequest,
    HealthCheckRequest,
    ListConnectedSynchronizersRequest,
    ListKnownPartiesRequest,
    TransportKind,
} from "../../../src/index.js";
import { createLiveClient } from "./live-client-factory.js";
import { LiveMultiNodeEnvironment } from "./live-multi-node-test-environment.js";
import { LiveTestEnvironment } from "./live-test-environment.js";

export async function assertLiveConnectivityAsync(
    environment: LiveTestEnvironment,
    init: {
        requireExternalPartyGrpcSupport?: boolean;
    } = {},
): Promise<void> {
    const client = createLiveClient(environment);

    try {
        if (environment.transportKind === TransportKind.grpc) {
            await assertGrpcLedgerConnectivityAsync(environment, client);

            if (init.requireExternalPartyGrpcSupport) {
                await assertGrpcLedgerAdminConnectivityAsync(
                    environment,
                    client,
                );
            }
        } else {
            await assertLedgerAdminConnectivityAsync(environment, client);
        }

        if (environment.options.participantAdminEndpoint !== undefined) {
            await assertParticipantAdminConnectivityAsync(environment, client);

            if (init.requireExternalPartyGrpcSupport) {
                await assertSynchronizerConnectivityAsync(environment, client);
            }
        }
    } finally {
        await client.disposeAsync();
    }
}

export async function assertLiveMultiNodeConnectivityAsync(
    environment: LiveMultiNodeEnvironment,
    init: {
        requiredNodeCount: number;
        requireExternalPartyGrpcSupport?: boolean;
        participantAdminOnlyNodeIndexes?: number[];
    } = {
        requiredNodeCount: 1,
    },
): Promise<void> {
    const availableNodeCount = environment.nodes.length;

    if (availableNodeCount < init.requiredNodeCount) {
        throw new Error(
            `Live multi-node environment requires ${init.requiredNodeCount} node(s), but only ${availableNodeCount} node environment(s) were created.`,
        );
    }

    for (const [index, nodeEnvironment] of environment.nodes
        .slice(0, init.requiredNodeCount)
        .entries()) {
        try {
            if (init.participantAdminOnlyNodeIndexes?.includes(index)) {
                const client = createLiveClient(nodeEnvironment);

                try {
                    await assertParticipantAdminConnectivityAsync(
                        nodeEnvironment,
                        client,
                    );
                } finally {
                    await client.disposeAsync();
                }
            } else {
                await assertLiveConnectivityAsync(nodeEnvironment, {
                    requireExternalPartyGrpcSupport:
                        init.requireExternalPartyGrpcSupport,
                });
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);

            throw new Error(
                `Live multi-node connectivity failed for node ${index + 1}: ${message}`,
            );
        }
    }
}

async function assertGrpcLedgerConnectivityAsync(
    environment: LiveTestEnvironment,
    client: ReturnType<typeof createLiveClient>,
): Promise<void> {
    try {
        await client.healthService.checkAsync(new HealthCheckRequest());
    } catch (error) {
        throw createConnectivityError(
            "ledger",
            environment.options.ledgerEndpoint,
            error,
        );
    }
}

async function assertLedgerAdminConnectivityAsync(
    environment: LiveTestEnvironment,
    client: ReturnType<typeof createLiveClient>,
): Promise<void> {
    try {
        await client.partyManagementService.listKnownPartiesAsync(
            new ListKnownPartiesRequest({
                pageSize: 1,
            }),
        );
    } catch (error) {
        throw createConnectivityError(
            "ledger admin",
            environment.options.ledgerAdminEndpoint,
            error,
        );
    }
}

async function assertGrpcLedgerAdminConnectivityAsync(
    environment: LiveTestEnvironment,
    client: ReturnType<typeof createLiveClient>,
): Promise<void> {
    try {
        await client.partyManagementService.getParticipantIdAsync(
            new GetParticipantIdRequest(),
        );
    } catch (error) {
        throw createConnectivityError(
            "ledger admin grpc",
            environment.options.ledgerAdminEndpoint,
            error,
        );
    }
}

async function assertParticipantAdminConnectivityAsync(
    environment: LiveTestEnvironment,
    client: ReturnType<typeof createLiveClient>,
): Promise<void> {
    try {
        await client.participantStatusService.getParticipantStatusAsync(
            new GetParticipantStatusRequest(),
        );
    } catch (error) {
        throw createConnectivityError(
            "participant admin",
            environment.options.participantAdminEndpoint,
            error,
        );
    }
}

async function assertSynchronizerConnectivityAsync(
    environment: LiveTestEnvironment,
    client: ReturnType<typeof createLiveClient>,
): Promise<void> {
    try {
        await client.synchronizerConnectivityService.listConnectedSynchronizersAsync(
            new ListConnectedSynchronizersRequest(),
        );
    } catch (error) {
        throw createConnectivityError(
            "participant admin synchronizer connectivity",
            environment.options.participantAdminEndpoint,
            error,
        );
    }
}

function createConnectivityError(
    surfaceName: string,
    endpoint: string | undefined,
    error: unknown,
): Error {
    const message = error instanceof Error ? error.message : String(error);

    return new Error(
        `Live quickstart ${surfaceName} connectivity check failed for ${endpoint ?? "<missing endpoint>"}: ${message}`,
    );
}
