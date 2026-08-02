import {
    CantonClient,
    GetLedgerEndRequest,
    OperationDeadline,
    RequestOptions,
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
import {
    buildUpdatesRequest,
    matchCreatedMessageUpdate,
} from "./ledger-requests.js";
import { exampleTimeoutMs } from "./localnet.js";
import type { RequestOptionsFactory } from "./request-options-factory.js";
import {
    expectIdleUpdateStreamTimeoutAsync,
    matchResumedUpdateAsync,
} from "./update-stream-lifecycle.js";
import {
    readWorkflowCompatibilityAsync,
    type WorkflowCompatibility,
} from "./workflow-compatibility.js";

type ExampleLogger = {
    log(message: string): void;
    warn(message: string): void;
};

export interface ResumeUpdateStreamWorkflowDependencies {
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

export interface ResumeUpdateStreamResult {
    readonly preContractId: string;
    readonly postContractId: string;
    readonly updateId: string;
    readonly offset: string;
}

export async function runResumeUpdateStreamWorkflowAsync(
    dependencies: ResumeUpdateStreamWorkflowDependencies,
): Promise<ResumeUpdateStreamResult> {
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

    const preResponse =
        await dependencies.client.commandService.submitAndWaitForTransactionAsync(
            buildCreateMessageRequest({
                party: actor.party,
                templateId: fixture.templateId,
                text: `resume-pre-${runId}`,
                commandId: `resume-pre-${runId}`,
            }),
            deadline.createRequestOptions(),
        );

    const preContract = extractCreatedContract(preResponse);

    const ledgerEnd = await dependencies.client.stateService.getLedgerEndAsync(
        new GetLedgerEndRequest(),
        deadline.createRequestOptions(),
    );

    const savedOffset = ledgerEnd.offset.trim();

    if (!savedOffset) {
        throw new Error("The ledger end returned an empty offset.");
    }

    const idleTimeoutMs = Math.max(1, Math.min(2_000, Math.floor(deadline.remainingTimeoutMs() / 4)));

    const idleStream = dependencies.client.updateService.getUpdatesAsync(
        buildUpdatesRequest({
            beginExclusive: savedOffset,
            party: actor.party,
            templateId: fixture.templateId,
        }),
        new RequestOptions({ timeoutMs: idleTimeoutMs }),
    );

    const idleIterator = idleStream[Symbol.asyncIterator]();

    const idleFirstNextPromise = idleIterator.next();

    const idleProbeOutcome = await expectIdleUpdateStreamTimeoutAsync({
        iterator: idleIterator,
        firstNextPromise: idleFirstNextPromise,
    });

    dependencies.logger.log(`Idle probe outcome: ${idleProbeOutcome}`);

    const postResponse =
        await dependencies.client.commandService.submitAndWaitForTransactionAsync(
            buildCreateMessageRequest({
                party: actor.party,
                templateId: fixture.templateId,
                text: `resume-post-${runId}`,
                commandId: `resume-post-${runId}`,
            }),
            deadline.createRequestOptions(),
        );

    const postContract = extractCreatedContract(postResponse);

    const resumedStream = dependencies.client.updateService.getUpdatesAsync(
        buildUpdatesRequest({
            beginExclusive: savedOffset,
            party: actor.party,
            templateId: fixture.templateId,
        }),
        deadline.createRequestOptions(),
    );

    const resumedIterator = resumedStream[Symbol.asyncIterator]();

    const resumedFirstNextPromise = resumedIterator.next();

    const matched = await matchResumedUpdateAsync({
        iterator: resumedIterator,
        firstNextPromise: resumedFirstNextPromise,
        reject: response => rejectPreOffsetContract(response, preContract.contractId),
        match: response =>
            matchCreatedMessageUpdate({
                response,
                contractId: postContract.contractId,
            }),
    });

    if (!matched.updateId.trim() || !matched.offset.trim()) {
        throw new Error("The resumed update did not contain a non-empty update ID and offset.");
    }

    dependencies.logger.log(`Update ID: ${matched.updateId}`);
    dependencies.logger.log(`Offset: ${matched.offset}`);
    dependencies.logger.log(`Pre-offset contract ID: ${preContract.contractId}`);
    dependencies.logger.log(`Post-offset contract ID: ${postContract.contractId}`);
    dependencies.logger.log(`Participant version: ${compatibility.participantVersion}`);
    dependencies.logger.log(`Release core: ${compatibility.releaseCore}`);
    dependencies.logger.log(`Compatibility path: ${compatibility.path}`);

    return {
        preContractId: preContract.contractId,
        postContractId: postContract.contractId,
        updateId: matched.updateId,
        offset: matched.offset,
    };
}

function rejectPreOffsetContract(
    response: ledgerApiV2.GetUpdatesResponse,
    preContractId: string,
): void {
    if (
        matchCreatedMessageUpdate({
            response,
            contractId: preContractId,
        }) !== undefined
    ) {
        throw new Error("Pre-offset update was replayed.");
    }
}

export const resumeUpdateStreamWorkflowDefaults = {
    loadFixtureAsync: loadExampleApplicationFixtureAsync,
    ensureDarUploadedAsync: ensureExampleDarUploadedAsync,
    resolvePartyAsync: resolveExamplePartyAsync,
    readCompatibilityAsync: readWorkflowCompatibilityAsync,
    createDeadline: (init: { timeoutMs: number }) => new OperationDeadline(init),
    timeoutMs: exampleTimeoutMs,
};
