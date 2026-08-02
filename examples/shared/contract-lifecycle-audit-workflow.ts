import {
    CantonClient,
    OperationDeadline,
    RequestOptions,
} from "@distrohelena/canton-typescript-sdk";
import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import {
    buildCreateMessageRequest,
    buildReplaceMessageTextRequest,
    ensureExampleDarUploadedAsync,
    extractCreatedContract,
    extractReplacementContracts,
    type ExampleApplicationFixture,
    loadExampleApplicationFixtureAsync,
    resolveExamplePartyAsync,
} from "./application-fixture.js";
import {
    assertDirectMessageLookup,
    buildMessageLifecycleEventFormat,
    waitForCompleteOriginalHistoryAsync,
} from "./contract-lifecycle-audit.js";
import { exampleTimeoutMs } from "./localnet.js";
import type { RequestOptionsFactory } from "./request-options-factory.js";
import {
    readWorkflowCompatibilityAsync,
    type WorkflowCompatibility,
} from "./workflow-compatibility.js";

type ExampleLogger = {
    log(message: string): void;
    warn(message: string): void;
};

export interface ContractLifecycleAuditWorkflowDependencies {
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
    readonly sleepAsync: (milliseconds: number) => Promise<void>;
    readonly logger: ExampleLogger;
}

export async function runContractLifecycleAuditWorkflowAsync(
    dependencies: ContractLifecycleAuditWorkflowDependencies,
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

    dependencies.logger.warn(
        "Warning: uploading a DAR creates durable localnet package state and is not cleaned up.",
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

    const originalText = `contract-lifecycle-original-${runId}`;

    const replacementText = `contract-lifecycle-replacement-${runId}`;

    const originalResponse =
        await dependencies.client.commandService.submitAndWaitForTransactionAsync(
            buildCreateMessageRequest({
                party: actor.party,
                templateId: fixture.templateId,
                text: originalText,
                commandId: `contract-lifecycle-create-${runId}`,
            }),
            deadline.createRequestOptions(),
        );

    const original = extractCreatedContract(originalResponse);

    const originalLookup = await dependencies.client.contractService.getContractAsync(
        ledgerApiV2.GetContractRequest.create({
            contractId: original.contractId,
            queryingParties: [actor.party],
        }),
        deadline.createRequestOptions(),
    );

    assertDirectMessageLookup({
        response: originalLookup,
        contractId: original.contractId,
        party: actor.party,
        templateId: fixture.templateId,
        text: originalText,
    });

    const replacementResponse =
        await dependencies.client.commandService.submitAndWaitForTransactionAsync(
            buildReplaceMessageTextRequest({
                party: actor.party,
                templateId: fixture.templateId,
                contractId: original.contractId,
                replacement: replacementText,
                commandId: `contract-lifecycle-replace-${runId}`,
            }),
            deadline.createRequestOptions(),
        );

    const replacement = extractReplacementContracts(replacementResponse);

    if (replacement.archivedContractId !== original.contractId) {
        throw new Error("ReplaceText did not archive the exact original contract.");
    } else if (
        !replacement.replacementContractId.trim()
        || replacement.replacementContractId === original.contractId
    ) {
        throw new Error("ReplaceText did not create a distinct replacement contract.");
    }

    const replacementLookup = await dependencies.client.contractService.getContractAsync(
        ledgerApiV2.GetContractRequest.create({
            contractId: replacement.replacementContractId,
            queryingParties: [actor.party],
        }),
        deadline.createRequestOptions(),
    );

    assertDirectMessageLookup({
        response: replacementLookup,
        contractId: replacement.replacementContractId,
        party: actor.party,
        templateId: fixture.templateId,
        text: replacementText,
    });

    const historyRequest = ledgerApiV2.GetEventsByContractIdRequest.create({
        contractId: original.contractId,
        eventFormat: buildMessageLifecycleEventFormat(actor.party, fixture.templateId),
    });

    const history = await waitForCompleteOriginalHistoryAsync({
        request: historyRequest,
        deadline,
        readHistoryAsync: (
            request: ledgerApiV2.GetEventsByContractIdRequest,
            options: RequestOptions,
        ) => dependencies.client.eventQueryService.getEventsByContractIdAsync(
            request,
            options,
        ),
        sleepAsync: dependencies.sleepAsync,
        contractId: original.contractId,
        replacementContractId: replacement.replacementContractId,
        party: actor.party,
        templateId: fixture.templateId,
        text: originalText,
    });

    const createdSynchronizerId = history.created?.synchronizerId;

    const archivedSynchronizerId = history.archived?.synchronizerId;

    if (
        createdSynchronizerId === undefined
        || archivedSynchronizerId === undefined
    ) {
        throw new Error("Complete contract history did not include synchronizer IDs.");
    }

    dependencies.logger.log(`Run marker: ${runId}`);
    dependencies.logger.log(`Actor party: ${actor.party}`);
    dependencies.logger.log(`Original contract ID: ${original.contractId}`);
    dependencies.logger.log(`Original sender: ${actor.party}`);
    dependencies.logger.log(`Original recipient: ${actor.party}`);
    dependencies.logger.log(`Original text: ${originalText}`);
    dependencies.logger.log(
        `Replacement contract ID: ${replacement.replacementContractId}`,
    );
    dependencies.logger.log(`Replacement sender: ${actor.party}`);
    dependencies.logger.log(`Replacement recipient: ${actor.party}`);
    dependencies.logger.log(`Replacement text: ${replacementText}`);
    dependencies.logger.log(`Created synchronizer ID: ${createdSynchronizerId}`);
    dependencies.logger.log(`Archived synchronizer ID: ${archivedSynchronizerId}`);
    dependencies.logger.log(`Participant version: ${compatibility.participantVersion}`);
    dependencies.logger.log(`Release core: ${compatibility.releaseCore}`);
    dependencies.logger.log(`Compatibility path: ${compatibility.path}`);
}

export const contractLifecycleAuditWorkflowDefaults = {
    loadFixtureAsync: loadExampleApplicationFixtureAsync,
    ensureDarUploadedAsync: ensureExampleDarUploadedAsync,
    resolvePartyAsync: resolveExamplePartyAsync,
    readCompatibilityAsync: readWorkflowCompatibilityAsync,
    createDeadline: (init: { timeoutMs: number }) => new OperationDeadline(init),
    timeoutMs: exampleTimeoutMs,
    sleepAsync: (milliseconds: number) => new Promise<void>(resolve => {
        setTimeout(resolve, milliseconds);
    }),
};
