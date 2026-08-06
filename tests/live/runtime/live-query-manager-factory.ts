import {
    AllocatePartyRequest,
    CantonManager,
    CantonClientOptions,
    CreateCommand,
    DamlNumeric,
    DamlParty,
    DamlRecord,
    ExerciseCommand,
    ListUserRightsRequest,
    QuerySource,
    RequestOptions,
    SubmitCommandsRequest,
    TransportKind,
    UserRightKind,
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
import { PqsPool } from "../../../src/query/pqs/pqs-pool.js";
import { PqsSchemaProfileV1, validatePqsSchemaAsync } from "../../../src/query/pqs/pqs-schema-profile.js";

const pqsReadyTimeoutMs = 120_000;

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

export interface LiveQueryParityPartyOptions {
    readonly visibleParty?: string;
    readonly pqsLedgerUserId?: string;
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
    // On a freshly booted localnet PQS creates its schema asynchronously, and PqsQueryClient's readiness
    // promise is one-shot — a manager constructed too early is poisoned even after PQS comes up. Wait for
    // the schema to validate before building managers.
    await waitForPqsSchemaReadyAsync(init.pqs);

    const grpc = new CantonManager({
        grpc: init.grpc,
        querySource: QuerySource.grpc,
        pqs: init.pqs,
        walkHistory: true,
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

        const party = await resolveLiveQueryParityPartyAsync(client, seeded.runId);

        await grantLedgerUserActAsAsync(client, party);

        const activeContractId = await createLiveIouAsync(client, party, party, packageId);

        const archivedContractId = await createLiveIouAsync(client, party, party, packageId);

        const archivedAtOffset = await archiveLiveIouAsync(
            client,
            party,
            archivedContractId,
            packageId,
        );

        return {
            environment: seeded.grpcEnvironment,
            packageId,
            templateId: queryModel.templateId,
            party,
            activeContractId,
            archivedContractId,
            archivedAtOffset,
        };
    } finally {
        await client.disposeAsync();
    }
}

export async function resolveLiveQueryParityPartyAsync(
    manager: CantonManager,
    runId: string,
    options: LiveQueryParityPartyOptions = {},
): Promise<string> {
    const visibleParty = (
        options.visibleParty
        ?? process.env.SDK_TEST_PQS_VISIBLE_PARTY
        ?? ""
    ).trim();

    if (visibleParty.length > 0) {
        return visibleParty;
    }

    const pqsLedgerUserId = (
        options.pqsLedgerUserId
        ?? process.env.SDK_TEST_PQS_LEDGER_USER_ID
        ?? ""
    ).trim() || "app-provider-pqs-user";

    const response = await manager.grpc.userManagementService.listUserRightsAsync(
        new ListUserRightsRequest({ userId: pqsLedgerUserId }),
    );

    if (response.rights.some((right) =>
        right.type === UserRightKind.canReadAsAnyParty
    )) {
        const partyHint = `sdk-query-parity-${runId}`;

        return (await manager.grpc.partyManagementService.allocatePartyAsync(
            new AllocatePartyRequest({
                partyIdHint: partyHint,
                displayName: partyHint,
            }),
        )).party;
    }

    const listedParties = [...new Set(response.rights.flatMap((right) => {
        if (
            right.type !== UserRightKind.canReadAs
            && right.type !== UserRightKind.canActAs
        ) {
            return [];
        }

        const party = right.party?.trim();

        return party === undefined || party.length === 0 ? [] : [party];
    }))];

    if (listedParties.length === 1) {
        return listedParties[0]!;
    } else if (listedParties.length === 0) {
        throw new Error(
            `PQS ledger user '${pqsLedgerUserId}' has no usable party visibility; set SDK_TEST_PQS_VISIBLE_PARTY explicitly.`,
        );
    }

    throw new Error(
        `PQS ledger user '${pqsLedgerUserId}' has ambiguous party visibility (${listedParties.join(", ")}); set SDK_TEST_PQS_VISIBLE_PARTY explicitly.`,
    );
}

async function waitForPqsSchemaReadyAsync(
    pqs: PqsQueryOptions,
    timeoutMs = 180_000,
    intervalMs = 2_000,
): Promise<void> {
    const pool = PqsPool.create(pqs.connectionString);

    try {
        const profile = new PqsSchemaProfileV1(pqs.schema);

        const deadline = Date.now() + timeoutMs;

        let lastError: unknown;

        while (Date.now() < deadline) {
            try {
                await validatePqsSchemaAsync(pool.pool, profile);

                return;
            } catch (error) {
                lastError = error;
            }

            await delayAsync(intervalMs);
        }

        throw new Error(`PQS schema was not ready within ${timeoutMs}ms: ${String(lastError)}`);
    } finally {
        await pool.disposeAsync();
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

    let lastError: unknown;

    while (Date.now() < deadline) {
        try {
            lastObserved = await inspectLivePqsParityReadinessAsync(manager, fixture);

            if (isLivePqsParityFixtureReady(lastObserved, fixture)) {
                return;
            }
        } catch (error) {
            // PQS may still be catching up on a freshly booted localnet; keep polling until the deadline.
            lastError = error;
        }

        await delayAsync(intervalMs);
    }

    throw new Error(
        `PQS did not index the complete parity fixture within ${timeoutMs}ms; observed ${JSON.stringify(lastObserved ?? {})}`
            + (lastError === undefined ? "." : `; last error: ${String(lastError)}.`),
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
        new RequestOptions({ timeoutMs: 30_000 }),
    );

    for (const event of response.events) {
        const contractId = createdContractId(event);

        if (contractId !== undefined) {
            return contractId;
        }
    }

    throw new Error("Live query parity Iou creation did not return a created contract id.");
}

export async function archiveLiveIouAsync(
    manager: CantonManager,
    party: string,
    contractId: string,
    packageId: string,
): Promise<string> {
    const response = await manager.grpc.commandService.submitAndWaitForTransactionAsync(
        new SubmitCommandsRequest({
            applicationId: "sdk-live-query-parity",
            actAs: [party],
            commands: [new ExerciseCommand({
                templateId: { ...iouTemplate, packageId },
                contractId,
                choice: "Archive",
                choiceArgument: {},
            })],
        }),
        new RequestOptions({ timeoutMs: 30_000 }),
    );

    const transaction = response.transaction;

    const offset = typeof transaction === "object" && transaction !== null
        ? (transaction as Record<string, unknown>).offset
        : undefined;

    if (typeof offset !== "string" || !/^[1-9]\d*$/u.test(offset)) {
        throw new Error(
            "Live query parity Archive did not return a positive transaction offset.",
        );
    }

    return offset;
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
