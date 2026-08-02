import {
    CantonClient,
    OperationDeadline,
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
} from "./ledger-requests.js";
import { createExampleActiveContractsTraversalOptions } from "./active-contracts-traversal.js";
import { exampleTimeoutMs } from "./localnet.js";
import {
    readWorkflowCompatibilityAsync,
    type WorkflowCompatibility,
} from "./workflow-compatibility.js";
import type { RequestOptionsFactory } from "./request-options-factory.js";
import {
    classifyWorkflowFailure,
    type WorkflowFailureKind,
} from "./workflow-errors.js";

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
        requestOptionsFactory: RequestOptionsFactory,
    ) => Promise<unknown>;
    readonly resolvePartyAsync: (
        client: CantonClient,
        environment: NodeJS.ProcessEnv,
        requestOptionsFactory: RequestOptionsFactory,
    ) => Promise<{ party: string; allocated: boolean }>;
    readonly readCompatibilityAsync: (
        client: CantonClient,
        requestOptionsFactory: RequestOptionsFactory,
    ) => Promise<WorkflowCompatibility>;
    readonly createDeadline: (init: { timeoutMs: number }) => OperationDeadline;
    readonly timeoutMs: () => number;
    readonly createRunId: () => string;
    readonly logger: ExampleLogger;
}

export async function runIdempotentCommandRetryWorkflowAsync(
    dependencies: IdempotentCommandRetryWorkflowDependencies,
): Promise<void> {
    const deadline = dependencies.createDeadline({
        timeoutMs: dependencies.timeoutMs(),
    });

    const fixture = await dependencies.loadFixtureAsync();

    await dependencies.ensureDarUploadedAsync(dependencies.client, fixture, deadline);

    const actor = await dependencies.resolvePartyAsync(
        dependencies.client,
        process.env,
        deadline,
    );

    const compatibility = await dependencies.readCompatibilityAsync(
        dependencies.client,
        deadline,
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
            deadline.createRequestOptions(),
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
            deadline.createRequestOptions(),
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

    const activeMessages = [];

    for await (const page of dependencies.client.stateService.getActiveContractsPagesAsync(
        request,
        createExampleActiveContractsTraversalOptions(deadline),
    )) {
        for (const response of page.activeContracts) {
            if (
                response.contractEntry.oneofKind !== "activeContract"
                || !ledgerApiV2.CreatedEvent.is(
                    response.contractEntry.activeContract.createdEvent,
                )
            ) {
                continue;
            }

            const message = response.contractEntry.activeContract.createdEvent;

            if (readCreatedMessageText(message) === marker) {
                activeMessages.push(message);
            }
        }
    }

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
    createDeadline: (init: { timeoutMs: number }) => new OperationDeadline(init),
    timeoutMs: exampleTimeoutMs,
};
