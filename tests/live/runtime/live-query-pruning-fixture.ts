import { GrpcTransport as ProtobufGrpcTransport } from "@protobuf-ts/grpc-transport";
import {
    CantonManager,
    QuerySource,
    TransportKind,
} from "../../../src/index.js";
import { UploadDarFileRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";
import { ParticipantPruningServiceClient } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/participant_pruning_service.client.js";
import { PruneRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/participant_pruning_service.js";
import { PruningServiceClient as CantonPruningServiceClient } from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.client.js";
import {
    GetSafePruningOffsetRequest,
    PruneRequest as CantonPruneRequest,
    SafeToPruneCommitmentState,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.js";
import { Timestamp } from "../../../src/transports/grpc/generated/canton/google/protobuf/timestamp.js";
import {
    buildGrpcCallOptionsAsync,
    createGrpcChannelCredentials,
} from "../../../src/transports/grpc/grpc-call-options-factory.js";
import {
    createLiveNodeTestEnvironment,
} from "./live-test-environment.js";
import { getLiveQueryModelFixtureAsync } from "./live-query-model-fixture.js";

const pruningPollTimeoutMs = 30_000;

const pruningPollIntervalMs = 500;

const pruningRequestTimeoutMs = 120_000;

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

    const queryModel = await getLiveQueryModelFixtureAsync();

    const manager = new CantonManager({
        grpc: environment.options,
        querySource: QuerySource.grpc,
        walkHistory: true,
    });

    try {
        await manager.grpc.packageManagementService.uploadDarFileAsync(
            UploadDarFileRequest.create({ darFile: queryModel.darBytes }),
        );

        const ledgerEnd = await manager.grpc.stateService.getLedgerEndAsync({});

        const safeOffset = await getSafePruningOffsetAsync(manager, ledgerEnd.offset);

        await pruneThroughAsync(environment, safeOffset);
        await waitForPruningAsync(manager, safeOffset);

        return {
            manager,
            templateId: queryModel.templateId,
            disposeAsync: () => manager.disposeAsync(),
        };
    } catch (error) {
        await manager.disposeAsync();

        throw error;
    }
}

async function getSafePruningOffsetAsync(
    manager: CantonManager,
    ledgerEnd: string,
    timeoutMs = 120_000,
    intervalMs = 5_000,
): Promise<string> {
    const deadline = Date.now() + timeoutMs;

    // A freshly booted participant publishes its first safe pruning offset only after a commitment tick;
    // poll for that event instead of failing on the first ask.
    while (true) {
        const response = await manager.grpc.pruningService.getSafePruningOffsetAsync(
            GetSafePruningOffsetRequest.create({
                beforeOrAt: Timestamp.create({
                    seconds: String(Math.floor(Date.now() / 1_000)),
                    nanos: 0,
                }),
                ledgerEnd,
            }),
        );

        if (response.response.oneofKind === "safePruningOffset") {
            const safeOffset = response.response.safePruningOffset;

            if (BigInt(safeOffset) > 0n && BigInt(safeOffset) < BigInt(ledgerEnd)) {
                return safeOffset;
            }
        }

        if (Date.now() >= deadline) {
            throw new Error(
                "Live query pruning found no safe offset within "
                    + `${timeoutMs}ms. Configure the dedicated participant with a shorter ACS journal `
                    + "garbage-collection delay or retain it long enough to produce a safe pruning point.",
            );
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
}

interface PruningEndpointPair {
    readonly ledgerEndpoint?: string;
    readonly ledgerAdminEndpoint?: string;
    readonly participantAdminEndpoint?: string;
}

export function assertDedicatedPruningEndpoints(
    candidate: PruningEndpointPair,
    protectedParticipants: readonly PruningEndpointPair[],
): void {
    const protectedEndpoints = protectedParticipants.flatMap((participant) => [
        participant.ledgerEndpoint,
        participant.ledgerAdminEndpoint,
        participant.participantAdminEndpoint,
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
    assertDedicatedPruningEndpoint(
        "participant-admin",
        candidate.participantAdminEndpoint,
        protectedEndpoints,
    );
}

function assertDedicatedPruningEndpoint(
    kind: "ledger" | "ledger-admin" | "participant-admin",
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

function pruningEndpointError(
    kind: "ledger" | "ledger-admin" | "participant-admin",
    endpoint: string | undefined,
): Error {
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

    return `${hostname}:${parsed.port || "443"}`;
}

function isLocalHostname(hostname: string): boolean {
    const unbracketed = hostname.replace(/^\[|\]$/gu, "");

    const ipv4MappedLoopback = /^::ffff:([\da-f]{1,4}):[\da-f]{1,4}$/iu.exec(
        unbracketed,
    );

    return unbracketed === "localhost"
        || unbracketed === "0.0.0.0"
        || unbracketed === "::"
        || unbracketed === "::1"
        || /^127(?:\.\d{1,3}){3}$/u.test(unbracketed)
        || (ipv4MappedLoopback !== null
            && (Number.parseInt(ipv4MappedLoopback[1]!, 16) >> 8) === 127);
}

async function pruneThroughAsync(
    environment: ReturnType<typeof createLiveNodeTestEnvironment>,
    pruneUpTo: string,
): Promise<void> {
    const ledgerEndpoint = environment.options.ledgerAdminEndpoint;

    if (ledgerEndpoint === undefined) {
        throw new Error("Live query pruning requires a ledger-admin endpoint.");
    }

    const participantEndpoint = environment.options.participantAdminEndpoint;

    if (participantEndpoint === undefined) {
        throw new Error("Live query pruning requires a participant-admin endpoint.");
    }

    const ledgerTransport = new ProtobufGrpcTransport({
        host: ledgerEndpoint.includes("://")
            ? new URL(ledgerEndpoint).host
            : ledgerEndpoint,
        channelCredentials: createGrpcChannelCredentials(
            environment.options.grpcChannelSecurity,
            environment.options.grpcTlsRootCertificates,
        ),
    });

    const participantTransport = new ProtobufGrpcTransport({
        host: participantEndpoint.includes("://")
            ? new URL(participantEndpoint).host
            : participantEndpoint,
        channelCredentials: createGrpcChannelCredentials(
            environment.options.grpcChannelSecurity,
            environment.options.grpcTlsRootCertificates,
        ),
    });

    try {
        const cantonPruning = new CantonPruningServiceClient(participantTransport);

        const ledgerPruning = new ParticipantPruningServiceClient(ledgerTransport);

        const participantOptions = await buildGrpcCallOptionsAsync(
            environment.options.participantAdminAuthProvider,
            environment.options.defaultRequestTimeoutMs,
            { timeoutMs: pruningRequestTimeoutMs },
        );

        const ledgerOptions = await buildGrpcCallOptionsAsync(
            environment.options.ledgerAdminAuthProvider,
            environment.options.defaultRequestTimeoutMs,
            { timeoutMs: pruningRequestTimeoutMs },
        );

        // Use the same matching-commitments policy as the ledger API. Prune Canton
        // stores first; the ledger API call then advances its own pruning watermark.
        await cantonPruning.prune(
            CantonPruneRequest.create({
                pruneUpTo,
                counterParticipantsCommitmentsState: SafeToPruneCommitmentState.MATCH,
            }),
            participantOptions,
        ).response;

        await ledgerPruning.prune(
            PruneRequest.create({
                pruneUpTo,
                submissionId: `sdk-query-pruning-${environment.runId}`,
                pruneAllDivulgedContracts: true,
            }),
            ledgerOptions,
        ).response;
    } finally {
        participantTransport.close();
        ledgerTransport.close();
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
