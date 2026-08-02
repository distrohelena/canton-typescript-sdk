import {
    CantonClient,
    OperationDeadline,
} from "@distrohelena/canton-typescript-sdk";
import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import {
    assertExactCreatedMessagePayload,
    buildCreateMessageRequest,
    buildReplaceMessageTextRequest,
    ensureExampleDarUploadedAsync,
    extractCreatedContract,
    extractReplacementContracts,
    type ExampleApplicationFixture,
    loadExampleApplicationFixtureAsync,
    readCreatedMessageText,
    resolveExamplePartyAsync,
} from "./application-fixture.js";
import {
    assertExactlyOneActiveMessage,
    assertMessageContractAbsent,
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

export interface ArchiveAndStaleContractWorkflowDependencies {
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

export async function runArchiveAndStaleContractWorkflowAsync(
    dependencies: ArchiveAndStaleContractWorkflowDependencies,
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

    const originalText = `archive-original-${runId}`;

    const replacementText = `archive-replacement-${runId}`;

    const originalCommandId = `archive-create-${runId}`;

    const replacementCommandId = `archive-replace-${runId}`;

    const staleCommandId = `archive-stale-${runId}`;

    const originalResponse =
        await dependencies.client.commandService.submitAndWaitForTransactionAsync(
            buildCreateMessageRequest({
                party: actor.party,
                templateId: fixture.templateId,
                text: originalText,
                commandId: originalCommandId,
            }),
            deadline.createRequestOptions(),
        );

    const originalContract = extractCreatedContract(originalResponse);

    const replacementResponse =
        await dependencies.client.commandService.submitAndWaitForTransactionAsync(
            buildReplaceMessageTextRequest({
                party: actor.party,
                templateId: fixture.templateId,
                contractId: originalContract.contractId,
                replacement: replacementText,
                commandId: replacementCommandId,
            }),
            deadline.createRequestOptions(),
        );

    const replacementContracts = extractReplacementContracts(replacementResponse);

    if (replacementContracts.archivedContractId !== originalContract.contractId) {
        throw new Error("ReplaceText did not archive the exact original contract.");
    } else if (
        !replacementContracts.replacementContractId.trim()
        || replacementContracts.replacementContractId === originalContract.contractId
    ) {
        throw new Error("ReplaceText did not create a distinct replacement contract.");
    }

    const runMessages = [];

    for await (const page of dependencies.client.stateService.getActiveContractsPagesAsync(
        buildActiveContractsRequest({
            party: actor.party,
            templateId: fixture.templateId,
        }),
        createExampleActiveContractsTraversalOptions(deadline),
    )) {
        for (const response of page.activeContracts) {
            if (response.contractEntry.oneofKind !== "activeContract") {
                continue;
            }

            const message = response.contractEntry.activeContract.createdEvent;

            if (!ledgerApiV2.CreatedEvent.is(message)) {
                continue;
            }

            const text = readCreatedMessageText(message);

            if (text === originalText || text === replacementText) {
                runMessages.push(message);
            }
        }
    }

    assertMessageContractAbsent({
        messages: runMessages,
        contractId: originalContract.contractId,
    });

    const activeReplacement = assertExactlyOneActiveMessage({
        messages: runMessages,
        textMarker: replacementText,
    });

    if (activeReplacement.contractId !== replacementContracts.replacementContractId) {
        throw new Error("The active replacement did not have the exact created contract ID.");
    }

    const actualReplacementText = readCreatedMessageText(activeReplacement);

    if (actualReplacementText !== replacementText) {
        throw new Error("The active replacement did not retain the exact replacement text.");
    }

    assertExactCreatedMessagePayload({
        event: activeReplacement,
        sender: actor.party,
        recipient: actor.party,
        text: replacementText,
    });

    const replacementPayload = JSON.stringify(activeReplacement.createArguments);

    if (replacementPayload === undefined) {
        throw new Error("The active replacement payload could not be rendered.");
    }

    let staleFailureKind: WorkflowFailureKind | undefined;

    try {
        await dependencies.client.commandService.submitAndWaitForTransactionAsync(
            buildReplaceMessageTextRequest({
                party: actor.party,
                templateId: fixture.templateId,
                contractId: originalContract.contractId,
                replacement: `archive-stale-replacement-${runId}`,
                commandId: staleCommandId,
            }),
            deadline.createRequestOptions(),
        );
    } catch (error) {
        staleFailureKind = classifyWorkflowFailure({
            error,
            kind: "staleContract",
            operation: "commandSubmission",
            compatibility,
        });
    }

    if (staleFailureKind === undefined) {
        throw new Error("The stale exercise against the archived original unexpectedly succeeded.");
    }

    dependencies.logger.log(`Actor party: ${actor.party}`);
    dependencies.logger.log(`Original contract ID: ${originalContract.contractId}`);
    dependencies.logger.log(
        `Replacement contract ID: ${replacementContracts.replacementContractId}`,
    );
    dependencies.logger.log(`Replacement payload: ${replacementPayload}`);
    dependencies.logger.log(`Replacement text: ${actualReplacementText}`);
    dependencies.logger.log(`Stale failure kind: ${staleFailureKind}`);
    dependencies.logger.log(`Participant version: ${compatibility.participantVersion}`);
    dependencies.logger.log(`Release core: ${compatibility.releaseCore}`);
    dependencies.logger.log(`Compatibility path: ${compatibility.path}`);
}

export const archiveAndStaleContractWorkflowDefaults = {
    loadFixtureAsync: loadExampleApplicationFixtureAsync,
    ensureDarUploadedAsync: ensureExampleDarUploadedAsync,
    resolvePartyAsync: resolveExamplePartyAsync,
    readCompatibilityAsync: readWorkflowCompatibilityAsync,
    createDeadline: (init: { timeoutMs: number }) => new OperationDeadline(init),
    timeoutMs: exampleTimeoutMs,
};
