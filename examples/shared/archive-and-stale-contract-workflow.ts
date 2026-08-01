import {
    CantonClient,
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
    readCreatedMessageText,
    resolveExamplePartyAsync,
} from "./application-fixture.js";
import {
    assertExactlyOneActiveMessage,
    assertMessageContractAbsent,
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

export interface ArchiveAndStaleContractWorkflowDependencies {
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

export async function runArchiveAndStaleContractWorkflowAsync(
    dependencies: ArchiveAndStaleContractWorkflowDependencies,
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
            new RequestOptions({ timeoutMs: deadline.remainingMs() }),
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
            new RequestOptions({ timeoutMs: deadline.remainingMs() }),
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

    const runMessages = await collectActiveMessagesAcrossPagesAsync({
        request: buildActiveContractsRequest({
            party: actor.party,
            templateId: fixture.templateId,
        }),
        predicate: message => {
            const text = readCreatedMessageText(message);

            return text === originalText || text === replacementText;
        },
        timeoutMs: deadline.remainingMs(),
        readPageAsync: pageRequest =>
            dependencies.client.stateService.getActiveContractsPageAsync(
                pageRequest,
                new RequestOptions({ timeoutMs: deadline.remainingMs() }),
            ),
    });

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

    assertExpectedReplacementPayload({
        createArguments: activeReplacement.createArguments,
        party: actor.party,
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
            new RequestOptions({ timeoutMs: deadline.remainingMs() }),
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
    createDeadline: createWorkflowDeadline,
    timeoutMs: exampleTimeoutMs,
};

function assertExpectedReplacementPayload(init: {
    readonly createArguments: unknown;
    readonly party: string;
    readonly text: string;
}): void {
    if (!ledgerApiV2.Record.is(init.createArguments)) {
        throw new Error("The active replacement did not contain an exact replacement payload record.");
    }

    const expectedFields = [
        { label: "sender", kind: "party", value: init.party },
        { label: "recipient", kind: "party", value: init.party },
        { label: "text", kind: "text", value: init.text },
    ] as const;

    if (init.createArguments.fields.length !== expectedFields.length) {
        throw new Error("The active replacement did not contain the exact replacement payload fields.");
    }

    for (const expected of expectedFields) {
        const field = init.createArguments.fields.find(
            candidate => candidate.label === expected.label,
        );

        if (field?.value === undefined) {
            throw new Error("The active replacement did not contain the exact replacement payload.");
        } else if (expected.kind === "party") {
            if (
                field.value.sum.oneofKind !== "party"
                || field.value.sum.party !== expected.value
            ) {
                throw new Error("The active replacement did not contain the exact replacement payload.");
            }
        } else if (
            field.value.sum.oneofKind !== "text"
            || field.value.sum.text !== expected.value
        ) {
            throw new Error("The active replacement did not contain the exact replacement payload.");
        }
    }
}
