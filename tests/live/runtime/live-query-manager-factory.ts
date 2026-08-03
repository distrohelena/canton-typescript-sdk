import {
    AllocatePartyRequest,
    CantonManager,
    CantonClientOptions,
    CreateCommand,
    DamlRecord,
    ExerciseCommand,
    QuerySource,
    SubmitCommandsRequest,
    TransportKind,
    type PqsQueryOptions,
} from "../../../src/index.js";
import { GrantUserRightsRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.js";
import { getLiveSeededContextAsync } from "./live-seeded-context.js";
import { resolveLiveIouPackageIdAsync } from "../fuzz/live-fuzz-fixture.js";
import {
    LiveTestEnvironment,
    createLiveTestEnvironment,
} from "./live-test-environment.js";

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
}

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

    const client = new CantonManager({
        grpc: seeded.grpcEnvironment.options,
        querySource: QuerySource.grpc,
    });

    try {
        const packageId = await resolveLiveIouPackageIdAsync(client.grpc);

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

        return {
            environment: seeded.grpcEnvironment,
            packageId,
            templateId: { ...iouTemplate, packageId },
            party,
            activeContractId,
            archivedContractId,
        };
    } finally {
        await client.disposeAsync();
    }
}

export async function waitForLivePqsContractsAsync(
    manager: CantonManager,
    contractIds: readonly string[],
): Promise<void> {
    const deadline = Date.now() + pqsReadyTimeoutMs;

    let lastObserved: readonly string[] = [];

    while (Date.now() < deadline) {
        const rows = await manager.query.contracts.findMany({
            where: { contractId: { in: contractIds } },
            orderBy: [{ contractId: "asc" }],
        });

        lastObserved = rows.map((row) => row.contractId);

        if (contractIds.every((contractId) => lastObserved.includes(contractId))) {
            return;
        }

        await delayAsync(pqsReadyIntervalMs);
    }

    throw new Error(
        `PQS did not index all parity contracts within ${pqsReadyTimeoutMs}ms; expected ${contractIds.join(", ")}, observed ${lastObserved.join(", ") || "<none>"}.`,
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
                createArguments: new DamlRecord({ issuer, owner, amount: 1 }),
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

    const created = record.created ?? record.createdEvent ?? record;

    return typeof (created as Record<string, unknown>).contractId === "string"
        ? (created as Record<string, unknown>).contractId as string
        : undefined;
}

function delayAsync(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
