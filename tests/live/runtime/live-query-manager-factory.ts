import {
    AllocatePartyRequest,
    CantonManager,
    CantonClientOptions,
    CreateCommand,
    DamlNumeric,
    DamlParty,
    DamlRecord,
    ExerciseCommand,
    QuerySource,
    SubmitCommandsRequest,
    TransportKind,
    type PqsQueryOptions,
} from "../../../src/index.js";
import { UploadDarFileRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";
import { GrantUserRightsRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.js";
import { getLiveSeededContextAsync } from "./live-seeded-context.js";
import {
    LiveTestEnvironment,
    createLiveTestEnvironment,
} from "./live-test-environment.js";
import { getLiveQueryModelFixtureAsync } from "./live-query-model-fixture.js";

const pqsReadyTimeoutMs = 30_000;

const pqsReadyIntervalMs = 500;

const iouTemplate = {
    packageId: "",
    moduleName: "Main",
    entityName: "Iou",
} as const;

export interface LiveQueryManagers {
    readonly grpc: CantonManager;
    readonly pqs: CantonManager;
    disposeAsync(): Promise<void>;
}

export interface LiveQueryParityFixture {
    readonly environment: LiveTestEnvironment;
    readonly packageId: string;
    readonly templateId: {
        readonly packageId: string;
        readonly moduleName: string;
        readonly entityName: string;
    };
    readonly party: string;
    readonly activeContractId: string;
    readonly archivedContractId: string;
    readonly archivedAtOffset: string;
}

export interface LivePqsParityWaitOptions {
    readonly timeoutMs?: number;
    readonly intervalMs?: number;
}

type LivePqsParityReadinessFixture = Pick<
    LiveQueryParityFixture,
    "packageId" | "templateId" | "activeContractId" | "archivedContractId" | "archivedAtOffset"
>;

/** Builds two managers over one participant-visible ledger and its PQS index. */
export async function createLiveQueryManagersAsync(init: {
    readonly grpc: CantonClientOptions;
    readonly pqs: PqsQueryOptions;
}): Promise<LiveQueryManagers> {
    const grpc = new CantonManager({
        grpc: init.grpc,
        querySource: QuerySource.grpc,
        pqs: init.pqs,
    });

    const pqs = new CantonManager({
        grpc: init.grpc,
        querySource: QuerySource.pqs,
        pqs: init.pqs,
    });

    return {
        grpc,
        pqs,
        async disposeAsync(): Promise<void> {
            await Promise.allSettled([grpc.disposeAsync(), pqs.disposeAsync()]);
        },
    };
}

export function createDefaultLiveQueryManagerOptions(): {
    readonly grpc: CantonClientOptions;
    readonly pqs: PqsQueryOptions;
} {
    const environment = createLiveTestEnvironment({
        transportKind: TransportKind.grpc,
    });

    return {
        grpc: environment.options,
        pqs: {
            connectionString:
                process.env.SDK_TEST_PQS_CONNECTION_STRING
                ?? "postgresql://cnadmin:supersafe@localhost:5432/pqs-app-provider",
            schema: process.env.SDK_TEST_PQS_SCHEMA ?? "public",
        },
    };
}

/** Uploads/reuses the live DAR, then creates one active and one archived Iou. */
export async function seedLiveQueryParityFixtureAsync(): Promise<LiveQueryParityFixture> {
    const seeded = await getLiveSeededContextAsync();

    const queryModel = await getLiveQueryModelFixtureAsync();

    const client = new CantonManager({
        grpc: seeded.grpcEnvironment.options,
        querySource: QuerySource.grpc,
    });

    try {
        await client.grpc.packageManagementService.uploadDarFileAsync(
            UploadDarFileRequest.create({ darFile: queryModel.darBytes }),
        );

        const packageId = queryModel.packageId;

        const partyHint = `sdk-query-parity-${seeded.runId}`;

        const allocated = await client.grpc.partyManagementService.allocatePartyAsync(
            new AllocatePartyRequest({ partyIdHint: partyHint, displayName: partyHint }),
        );

        const party = allocated.party;

        await grantLedgerUserActAsAsync(client, party);

        const activeContractId = await createLiveIouAsync(client, party, party, packageId);

        const archivedContractId = await createLiveIouAsync(client, party, party, packageId);

        await client.grpc.commandService.submitAndWaitAsync(
            new SubmitCommandsRequest({
                applicationId: "sdk-live-query-parity",
                actAs: [party],
                commands: [new ExerciseCommand({
                    templateId: { ...iouTemplate, packageId },
                    contractId: archivedContractId,
                    choice: "Archive",
                    choiceArgument: {},
                })],
            }),
        );

        const archiveEnd = await client.grpc.stateService.getLedgerEndAsync({});

        return {
            environment: seeded.grpcEnvironment,
            packageId,
            templateId: queryModel.templateId,
            party,
            activeContractId,
            archivedContractId,
            archivedAtOffset: archiveEnd.offset,
        };
    } finally {
        await client.disposeAsync();
    }
}

export async function waitForLivePqsParityFixtureAsync(
    manager: CantonManager,
    fixture: LivePqsParityReadinessFixture,
    options: LivePqsParityWaitOptions = {},
): Promise<void> {
    const timeoutMs = options.timeoutMs ?? pqsReadyTimeoutMs;

    const intervalMs = options.intervalMs ?? pqsReadyIntervalMs;

    const deadline = Date.now() + timeoutMs;

    let lastObserved: LivePqsParityReadiness | undefined;

    while (Date.now() < deadline) {
        lastObserved = await inspectLivePqsParityReadinessAsync(manager, fixture);

        if (isLivePqsParityFixtureReady(lastObserved, fixture)) {
            return;
        }

        await delayAsync(intervalMs);
    }

    throw new Error(
        `PQS did not index the complete parity fixture within ${timeoutMs}ms; observed ${JSON.stringify(lastObserved ?? {})}.`,
    );
}

interface LivePqsParityReadiness {
    readonly contractIds: readonly string[];
    readonly exerciseCount: number;
    readonly eventCount: number;
    readonly transactionCount: number;
    readonly packageIds: readonly string[];
    readonly contractTypeCount: number;
    readonly exerciseTypeCount: number;
    readonly watermarkOffsets: readonly string[];
}

async function inspectLivePqsParityReadinessAsync(
    manager: CantonManager,
    fixture: LivePqsParityReadinessFixture,
): Promise<LivePqsParityReadiness> {
    const archivedExercise = {
        some: { contractId: { equals: fixture.archivedContractId } },
    } as const;

    const [contracts, exercises, events, transactions, packages, contractTypes, exerciseTypes, watermark] = await Promise.all([
        manager.query.contracts.findMany({
            where: {
                contractId: {
                    in: [fixture.activeContractId, fixture.archivedContractId],
                },
            },
        }),
        manager.query.exercises.findMany({
            where: { contractId: { equals: fixture.archivedContractId } },
        }),
        manager.query.events.findMany({
            where: { exercises: archivedExercise },
        }),
        manager.query.transactions.findMany({
            where: { exercises: archivedExercise },
        }),
        manager.query.packages.findMany({
            where: { id: { equals: fixture.packageId } },
        }),
        manager.query.contractTypes.findMany({
            where: {
                moduleName: { equals: fixture.templateId.moduleName },
                entityName: { equals: fixture.templateId.entityName },
                contracts: {
                    some: { contractId: { equals: fixture.archivedContractId } },
                },
            },
        }),
        manager.query.exerciseTypes.findMany({
            where: { exercises: archivedExercise },
        }),
        manager.query.watermark.findMany({
            where: {
                singleton: { equals: true },
                offset: { gte: fixture.archivedAtOffset },
            },
        }),
    ]);

    return {
        contractIds: contracts.map((row) => row.contractId),
        exerciseCount: exercises.length,
        eventCount: events.length,
        transactionCount: transactions.length,
        packageIds: packages.map((row) => row.id),
        contractTypeCount: contractTypes.length,
        exerciseTypeCount: exerciseTypes.length,
        watermarkOffsets: watermark.flatMap((row) => row.offset === null ? [] : [row.offset]),
    };
}

function isLivePqsParityFixtureReady(
    readiness: LivePqsParityReadiness,
    fixture: LivePqsParityReadinessFixture,
): boolean {
    return readiness.contractIds.includes(fixture.activeContractId)
        && readiness.contractIds.includes(fixture.archivedContractId)
        && readiness.exerciseCount > 0
        && readiness.eventCount > 0
        && readiness.transactionCount > 0
        && readiness.packageIds.includes(fixture.packageId)
        && readiness.contractTypeCount > 0
        && readiness.exerciseTypeCount > 0
        && readiness.watermarkOffsets.some((offset) =>
            BigInt(offset) >= BigInt(fixture.archivedAtOffset)
        );
}

export async function createLiveIouAsync(
    manager: CantonManager,
    issuer: string,
    owner: string,
    packageId: string,
): Promise<string> {
    const response = await manager.grpc.commandService.submitAndWaitForTransactionAsync(
        new SubmitCommandsRequest({
            applicationId: "sdk-live-query-parity",
            actAs: [issuer],
            commands: [new CreateCommand({
                templateId: { ...iouTemplate, packageId },
                createArguments: new DamlRecord({
                    issuer: new DamlParty(issuer),
                    owner: new DamlParty(owner),
                    amount: new DamlNumeric("1.0"),
                }),
            })],
        }),
    );

    for (const event of response.events) {
        const contractId = createdContractId(event);

        if (contractId !== undefined) {
            return contractId;
        }
    }

    throw new Error("Live query parity Iou creation did not return a created contract id.");
}

export async function grantLedgerUserActAsAsync(manager: CantonManager, party: string): Promise<void> {
    await manager.grpc.userManagementService.grantUserRightsAsync(
        GrantUserRightsRequest.create({
            userId: process.env.SDK_TEST_LEDGER_USER_ID ?? "ledger-api-user",
            identityProviderId: "",
            rights: [{
                kind: {
                    oneofKind: "canActAs",
                    canActAs: { party },
                },
            }],
        }),
    );
}

function createdContractId(value: unknown): string | undefined {
    if (typeof value !== "object" || value === null) {
        return undefined;
    }

    const record = value as Record<string, unknown>;

    if (typeof record.event === "object" && record.event !== null) {
        const event = record.event as Record<string, unknown>;

        if (event.oneofKind === "created") {
            return createdContractId(event.created);
        }
    }

    const created = record.created ?? record.createdEvent ?? record;

    return typeof (created as Record<string, unknown>).contractId === "string"
        ? (created as Record<string, unknown>).contractId as string
        : undefined;
}

function delayAsync(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
