import {
    CantonClient,
    RequestOptions,
} from "@distrohelena/canton-typescript-sdk";
import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import {
    buildCreateMessageRequest,
    ensureExampleDarUploadedAsync,
    extractCreatedContract,
    type ExampleApplicationFixture,
    loadExampleApplicationFixtureAsync,
    readCreatedMessageText,
    resolveExamplePartyAsync,
} from "./application-fixture.js";
import {
    assertExactlyOneActiveMessage,
    buildActiveContractsRequest,
    collectActiveMessagesAcrossPagesAsync,
} from "./ledger-requests.js";
import { exampleTimeoutMs } from "./localnet.js";
import {
    readWorkflowCompatibilityAsync,
    type WorkflowCompatibility,
} from "./workflow-compatibility.js";
import {
    createWorkflowDeadline,
    type WorkflowDeadline,
} from "./workflow-deadline.js";
import {
    classifyWorkflowFailure,
    type WorkflowFailureKind,
} from "./workflow-errors.js";

type RemainingBudget = {
    readonly remainingTimeoutMs: () => number;
};

type ExampleLogger = {
    log(message: string): void;
    warn(message: string): void;
};

export interface IdempotentCommandRetryWorkflowDependencies {
    readonly client: CantonClient;
    readonly loadFixtureAsync: () => Promise<ExampleApplicationFixture>;
    readonly ensureDarUploadedAsync: (
        client: CantonClient,
        fixture: ExampleApplicationFixture,
        budget: RemainingBudget,
    ) => Promise<unknown>;
    readonly resolvePartyAsync: (
        client: CantonClient,
        environment: NodeJS.ProcessEnv,
        budget: RemainingBudget,
    ) => Promise<{ party: string; allocated: boolean }>;
    readonly readCompatibilityAsync: (
        client: CantonClient,
        budget: RemainingBudget,
    ) => Promise<WorkflowCompatibility>;
    readonly createDeadline: (init: { timeoutMs: number }) => WorkflowDeadline;
    readonly timeoutMs: () => number;
    readonly createRunId: () => string;
    readonly logger: ExampleLogger;
}

export async function runIdempotentCommandRetryWorkflowAsync(
    dependencies: IdempotentCommandRetryWorkflowDependencies,
): Promise<void> {
    const fixture = await dependencies.loadFixtureAsync();

    const deadline = dependencies.createDeadline({
        timeoutMs: dependencies.timeoutMs(),
    });

    await dependencies.ensureDarUploadedAsync(dependencies.client, fixture, {
        remainingTimeoutMs: deadline.remainingMs,
    });

    const actor = await dependencies.resolvePartyAsync(
        dependencies.client,
        process.env,
        { remainingTimeoutMs: deadline.remainingMs },
    );

    const compatibility = await dependencies.readCompatibilityAsync(
        dependencies.client,
        { remainingTimeoutMs: deadline.remainingMs },
    );

    if (actor.allocated) {
        dependencies.logger.warn(
            "Warning: fallback party allocation creates durable localnet topology state and is not cleaned up.",
        );
    }

    dependencies.logger.warn(
        "Warning: created contracts and localnet ledger state are durable and are not cleaned up.",
    );

    const runId = dependencies.createRunId();

    const marker = `retry-marker-${runId}`;

    const commandId = `retry-command-${runId}`;

    const retryRequest = buildCreateMessageRequest({
        party: actor.party,
        templateId: fixture.templateId,
        text: marker,
        commandId,
        deduplicationPeriod: { kind: "duration", seconds: 30 },
    });

    const firstResponse =
        await dependencies.client.commandService.submitAndWaitForTransactionAsync(
            retryRequest,
            new RequestOptions({ timeoutMs: deadline.remainingMs() }),
        );

    if (!firstResponse.transactionId.trim()) {
        throw new Error("The first command submission did not return a transaction ID.");
    }

    const firstCreated = extractCreatedContract(firstResponse);

    if (!firstCreated.contractId.trim()) {
        throw new Error("The first command submission did not create a contract ID.");
    }

    let duplicateCommandKind: WorkflowFailureKind;

    try {
        await dependencies.client.commandService.submitAndWaitForTransactionAsync(
            retryRequest,
            new RequestOptions({ timeoutMs: deadline.remainingMs() }),
        );

        throw new Error("The duplicate command retry unexpectedly succeeded.");
    } catch (error) {
        duplicateCommandKind = classifyWorkflowFailure({
            error,
            kind: "duplicateCommand",
            operation: "commandSubmission",
            compatibility,
        });
    }

    const request = buildActiveContractsRequest({
        party: actor.party,
        templateId: fixture.templateId,
    });

    const activeMessages = await collectActiveMessagesAcrossPagesAsync({
        request,
        textMarker: marker,
        timeoutMs: deadline.remainingMs(),
        readPageAsync: pageRequest =>
            dependencies.client.stateService.getActiveContractsPageAsync(
                pageRequest,
                new RequestOptions({ timeoutMs: deadline.remainingMs() }),
            ),
    });

    const activeMessage = assertExactlyOneActiveMessage({
        messages: activeMessages,
        textMarker: marker,
    });

    if (activeMessage.contractId !== firstCreated.contractId) {
        throw new Error(
            "The active Message for the idempotent retry did not match the first created contract.",
        );
    } else if (readCreatedMessageText(activeMessage) !== marker) {
        throw new Error("The active Message did not retain the exact retry marker.");
    }

    const activePayload = JSON.stringify(activeMessage.createArguments);

    if (activePayload === undefined) {
        throw new Error("The active Message payload could not be rendered.");
    }

    dependencies.logger.log(`Actor party: ${actor.party}`);
    dependencies.logger.log(`Command ID: ${commandId}`);
    dependencies.logger.log(`First transaction ID: ${firstResponse.transactionId}`);
    dependencies.logger.log(`First created contract: ${firstCreated.contractId}`);
    dependencies.logger.log(`Duplicate command kind: ${duplicateCommandKind}`);
    dependencies.logger.log(`Active count: ${activeMessages.length}`);
    dependencies.logger.log(`Participant version: ${compatibility.participantVersion}`);
    dependencies.logger.log(`Release core: ${compatibility.releaseCore}`);
    dependencies.logger.log(`Compatibility path: ${compatibility.path}`);
    dependencies.logger.log(`Active payload: ${activePayload}`);
}

export const idempotentCommandRetryWorkflowDefaults = {
    loadFixtureAsync: loadExampleApplicationFixtureAsync,
    ensureDarUploadedAsync: ensureExampleDarUploadedAsync,
    resolvePartyAsync: resolveExamplePartyAsync,
    readCompatibilityAsync: readWorkflowCompatibilityAsync,
    createDeadline: createWorkflowDeadline,
    timeoutMs: exampleTimeoutMs,
};
