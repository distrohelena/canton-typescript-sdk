import { GrpcTransport as ProtobufGrpcTransport } from "@protobuf-ts/grpc-transport";
import {
    AllocatePartyRequest,
    CantonManager,
    ExerciseCommand,
    QuerySource,
    SubmitCommandsRequest,
    TransportKind,
} from "../../../src/index.js";
import { UploadDarFileRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";
import { ParticipantPruningServiceClient } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/participant_pruning_service.client.js";
import { PruneRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/participant_pruning_service.js";
import {
    buildGrpcCallOptionsAsync,
    createGrpcChannelCredentials,
} from "../../../src/transports/grpc/grpc-call-options-factory.js";
import { getLiveSeededContextAsync } from "./live-seeded-context.js";
import {
    createLiveNodeTestEnvironment,
} from "./live-test-environment.js";
import {
    createLiveIouAsync,
    grantLedgerUserActAsAsync,
} from "./live-query-manager-factory.js";
import { resolveLiveIouPackageIdAsync } from "../fuzz/live-fuzz-fixture.js";

const pruningPollTimeoutMs = 30_000;

const pruningPollIntervalMs = 500;

export interface LiveQueryPruningFixture {
    readonly manager: CantonManager;
    readonly templateId: {
        readonly packageId: string;
        readonly moduleName: string;
        readonly entityName: string;
    };
    disposeAsync(): Promise<void>;
}

/** Uses the first extra quickstart participant exclusively, because pruning is destructive. */
export async function createLiveQueryPruningFixtureAsync(): Promise<LiveQueryPruningFixture> {
    const environment = createLiveNodeTestEnvironment({
        transportKind: TransportKind.grpc,
        nodeIndex: 2,
    });

    const primary = createLiveNodeTestEnvironment({
        transportKind: TransportKind.grpc,
        nodeIndex: 0,
    });

    const secondary = createLiveNodeTestEnvironment({
        transportKind: TransportKind.grpc,
        nodeIndex: 1,
    });

    assertDedicatedPruningEndpoints(environment.options, [
        primary.options,
        secondary.options,
    ]);

    const seeded = await getLiveSeededContextAsync();

    const manager = new CantonManager({
        grpc: environment.options,
        querySource: QuerySource.grpc,
    });

    try {
        await manager.grpc.packageManagementService.uploadDarFileAsync(
            UploadDarFileRequest.create({ darFile: seeded.uploadedDarBytes }),
        );

        const packageId = await resolveLiveIouPackageIdAsync(manager.grpc);

        const partyHint = `sdk-query-pruning-${environment.runId}`;

        const party = (await manager.grpc.partyManagementService.allocatePartyAsync(
            new AllocatePartyRequest({ partyIdHint: partyHint, displayName: partyHint }),
        )).party;

        await grantLedgerUserActAsAsync(manager, party);

        const contractId = await createLiveIouAsync(
            manager,
            party,
            party,
            packageId,
        );

        await manager.grpc.commandService.submitAndWaitAsync(
            new SubmitCommandsRequest({
                applicationId: "sdk-live-query-pruning",
                actAs: [party],
                commands: [new ExerciseCommand({
                    templateId: {
                        packageId,
                        moduleName: "Main",
                        entityName: "Iou",
                    },
                    contractId,
                    choice: "Archive",
                    choiceArgument: {},
                })],
            }),
        );

        const archiveEnd = await manager.grpc.stateService.getLedgerEndAsync({});

        await pruneThroughAsync(environment, archiveEnd.offset);
        await waitForPruningAsync(manager, archiveEnd.offset);

        return {
            manager,
            templateId: {
                packageId,
                moduleName: "Main",
                entityName: "Iou",
            },
            disposeAsync: () => manager.disposeAsync(),
        };
    } catch (error) {
        await manager.disposeAsync();

        throw error;
    }
}

interface PruningEndpointPair {
    readonly ledgerEndpoint?: string;
    readonly ledgerAdminEndpoint?: string;
}

export function assertDedicatedPruningEndpoints(
    candidate: PruningEndpointPair,
    protectedParticipants: readonly PruningEndpointPair[],
): void {
    const protectedEndpoints = protectedParticipants.flatMap((participant) => [
        participant.ledgerEndpoint,
        participant.ledgerAdminEndpoint,
    ]);

    assertDedicatedPruningEndpoint(
        "ledger",
        candidate.ledgerEndpoint,
        protectedEndpoints,
    );
    assertDedicatedPruningEndpoint(
        "ledger-admin",
        candidate.ledgerAdminEndpoint,
        protectedEndpoints,
    );
}

function assertDedicatedPruningEndpoint(
    kind: "ledger" | "ledger-admin",
    candidate: string | undefined,
    protectedEndpoints: readonly (string | undefined)[],
): void {
    if (candidate === undefined) {
        throw pruningEndpointError(kind, candidate);
    }

    const protectedTargets = protectedEndpoints.map((endpoint) => {
        if (endpoint === undefined) {
            throw new Error(
                `Live query pruning cannot verify ${kind} isolation because a protected participant endpoint is missing.`,
            );
        }

        return normalizePruningEndpoint(endpoint);
    });

    if (protectedTargets.includes(normalizePruningEndpoint(candidate))) {
        throw pruningEndpointError(kind, candidate);
    }
}

function pruningEndpointError(kind: "ledger" | "ledger-admin", endpoint: string | undefined): Error {
    return new Error(
        `Live query pruning requires a dedicated ${kind} endpoint; received ${endpoint ?? "<missing>"}. Start the quickstart with EXTRA_PARTICIPANTS=1.`,
    );
}

function normalizePruningEndpoint(endpoint: string): string {
    const value = endpoint.trim();

    if (value.length === 0) {
        throw new Error("Live query pruning endpoint cannot be empty.");
    }

    const parsed = new URL(
        /^[a-z][a-z\d+.-]*:\/\//iu.test(value) ? value : `grpc://${value}`,
    );

    const rawHostname = parsed.hostname.toLowerCase().replace(/\.$/u, "");

    const hostname = isLocalHostname(rawHostname) ? "loopback" : rawHostname;

    const defaultPort = parsed.protocol === "http:"
        ? "80"
        : parsed.protocol === "https:"
            ? "443"
            : "";

    return `${hostname}:${parsed.port || defaultPort}`;
}

function isLocalHostname(hostname: string): boolean {
    const unbracketed = hostname.replace(/^\[|\]$/gu, "");

    return unbracketed === "localhost"
        || unbracketed === "0.0.0.0"
        || unbracketed === "::"
        || unbracketed === "::1"
        || /^127(?:\.\d{1,3}){3}$/u.test(unbracketed);
}

async function pruneThroughAsync(
    environment: ReturnType<typeof createLiveNodeTestEnvironment>,
    pruneUpTo: string,
): Promise<void> {
    const endpoint = environment.options.ledgerAdminEndpoint;

    if (endpoint === undefined) {
        throw new Error("Live query pruning requires a ledger-admin endpoint.");
    }

    const transport = new ProtobufGrpcTransport({
        host: endpoint.includes("://") ? new URL(endpoint).host : endpoint,
        channelCredentials: createGrpcChannelCredentials(
            environment.options.grpcChannelSecurity,
            environment.options.grpcTlsRootCertificates,
        ),
    });

    try {
        const pruning = new ParticipantPruningServiceClient(transport);

        const options = await buildGrpcCallOptionsAsync(
            environment.options.ledgerAdminAuthProvider,
            environment.options.defaultRequestTimeoutMs,
        );

        await pruning.prune(
            PruneRequest.create({
                pruneUpTo,
                submissionId: `sdk-query-pruning-${environment.runId}`,
                pruneAllDivulgedContracts: true,
            }),
            options,
        ).response;
    } finally {
        transport.close();
    }
}

async function waitForPruningAsync(manager: CantonManager, expectedOffset: string): Promise<void> {
    const deadline = Date.now() + pruningPollTimeoutMs;

    let observed = "0";

    while (Date.now() < deadline) {
        observed = (await manager.grpc.stateService.getLatestPrunedOffsetsAsync({}))
            .participantPrunedUpToInclusive;

        if (BigInt(observed) >= BigInt(expectedOffset) && BigInt(observed) > 0n) {
            return;
        }

        await delayAsync(pruningPollIntervalMs);
    }

    throw new Error(
        `Participant pruning did not reach ${expectedOffset} within ${pruningPollTimeoutMs}ms; latest reported offset was ${observed}.`,
    );
}

function delayAsync(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
