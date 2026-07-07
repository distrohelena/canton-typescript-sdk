import {
    GetParticipantStatusRequest,
    HealthCheckRequest,
    ListKnownPartiesRequest,
    TransportKind,
} from "../../../src/index.js";
import { createLiveClient } from "./live-client-factory.js";
import { LiveTestEnvironment } from "./live-test-environment.js";

export async function assertLiveConnectivityAsync(
    environment: LiveTestEnvironment,
): Promise<void> {
    const client = createLiveClient(environment);

    try {
        if (environment.transportKind === TransportKind.grpc) {
            await assertGrpcLedgerConnectivityAsync(environment, client);
        } else {
            await assertLedgerAdminConnectivityAsync(environment, client);
        }

        if (environment.options.participantAdminEndpoint !== undefined) {
            await assertParticipantAdminConnectivityAsync(environment, client);
        }
    } finally {
        await client.disposeAsync();
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
