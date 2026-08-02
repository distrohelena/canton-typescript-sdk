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
    resolveExamplePartyAsync,
} from "./application-fixture.js";
import { buildMessageUpdateFormat } from "./ledger-requests.js";
import { exampleTimeoutMs } from "./localnet.js";
import type { RequestOptionsFactory } from "./request-options-factory.js";
import {
    assertUpdateLookupMatchesCapturedMessageTransaction,
    captureExactMessageTransaction,
} from "./update-lookup-reconciliation.js";
import { cleanupWithoutMaskingAsync } from "./update-stream-lifecycle.js";
import {
    readWorkflowCompatibilityAsync,
    type WorkflowCompatibility,
} from "./workflow-compatibility.js";

type ExampleLogger = { log(message: string): void; warn(message: string): void };

export interface UpdateLookupReconciliationWorkflowDependencies {
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

export async function runUpdateLookupReconciliationWorkflowAsync(
    dependencies: UpdateLookupReconciliationWorkflowDependencies,
): Promise<void> {
    const deadline = dependencies.createDeadline({ timeoutMs: dependencies.timeoutMs() });

    const fixture = await dependencies.loadFixtureAsync();

    await dependencies.ensureDarUploadedAsync(dependencies.client, fixture, deadline);

    const actor = await dependencies.resolvePartyAsync(dependencies.client, process.env, deadline);

    const compatibility = await dependencies.readCompatibilityAsync(dependencies.client, deadline);

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

    const ledgerEnd = await dependencies.client.stateService.getLedgerEndAsync(
        ledgerApiV2.GetLedgerEndRequest.create(),
        deadline.createRequestOptions(),
    );

    const savedOffset = ledgerEnd.offset.trim();

    if (!savedOffset) {
        throw new Error("The ledger end response did not include a non-empty offset.");
    }

    const updateFormat = buildMessageUpdateFormat({ party: actor.party, templateId: fixture.templateId });

    const stream = dependencies.client.updateService.getUpdatesAsync(
        ledgerApiV2.GetUpdatesRequest.create({
            beginExclusive: savedOffset,
            updateFormat,
            descendingOrder: false,
        }),
        deadline.createRequestOptions(),
    );

    const iterator = stream[Symbol.asyncIterator]();

    const firstNextPromise = iterator.next();

    void firstNextPromise.catch(() => undefined);

    let primaryFailed = false;

    try {
        const runId = dependencies.createRunId();

        const text = `update-lookup-reconciliation-${runId}`;

        const commandId = `update-lookup-reconciliation-${runId}`;

        const submitted = await dependencies.client.commandService.submitAndWaitForTransactionAsync(
            buildCreateMessageRequest({ party: actor.party, templateId: fixture.templateId, text, commandId }),
            deadline.createRequestOptions(),
        );

        const created = extractCreatedContract(submitted);

        let next = await firstNextPromise;

        let captured;

        for (;;) {
            if (next.done) {
                throw new Error("Update stream ended before the submitted Message transaction was observed.");
            }

            captured = captureExactMessageTransaction({
                response: next.value,
                contractId: created.contractId,
                party: actor.party,
                templateId: fixture.templateId,
                text,
                commandId,
            });

            if (captured !== undefined) {
                break;
            }

            next = await iterator.next();
        }

        const byId = await dependencies.client.updateService.getUpdateByIdAsync(
            ledgerApiV2.GetUpdateByIdRequest.create({ updateId: captured.updateId, updateFormat }),
            deadline.createRequestOptions(),
        );

        assertUpdateLookupMatchesCapturedMessageTransaction({ response: byId, captured });

        const byOffset = await dependencies.client.updateService.getUpdateByOffsetAsync(
            ledgerApiV2.GetUpdateByOffsetRequest.create({ offset: captured.offset, updateFormat }),
            deadline.createRequestOptions(),
        );

        assertUpdateLookupMatchesCapturedMessageTransaction({ response: byOffset, captured });

        dependencies.logger.log(`Run marker: ${runId}`);
        dependencies.logger.log(`Actor party: ${actor.party}`);
        dependencies.logger.log(`Contract ID: ${captured.contractId}`);
        dependencies.logger.log(`Update ID: ${captured.updateId}`);
        dependencies.logger.log(`Offset: ${captured.offset}`);
        dependencies.logger.log(`Synchronizer ID: ${captured.synchronizerId}`);
        dependencies.logger.log("Update ID lookup reconciled: true");
        dependencies.logger.log("Update offset lookup reconciled: true");
        dependencies.logger.log(`Participant version: ${compatibility.participantVersion}`);
        dependencies.logger.log(`Release core: ${compatibility.releaseCore}`);
        dependencies.logger.log(`Compatibility path: ${compatibility.path}`);
    } catch (error) {
        primaryFailed = true;

        throw error;
    } finally {
        await cleanupWithoutMaskingAsync(() => iterator.return?.(), primaryFailed);
    }
}

export const updateLookupReconciliationWorkflowDefaults = {
    loadFixtureAsync: loadExampleApplicationFixtureAsync,
    ensureDarUploadedAsync: ensureExampleDarUploadedAsync,
    resolvePartyAsync: resolveExamplePartyAsync,
    readCompatibilityAsync: readWorkflowCompatibilityAsync,
    createDeadline: (init: { timeoutMs: number }) => new OperationDeadline(init),
    timeoutMs: exampleTimeoutMs,
};
