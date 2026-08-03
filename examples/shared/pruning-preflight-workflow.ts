import {
    CantonClient,
    OperationDeadline,
} from "@distrohelena/canton-typescript-sdk";
import {
    comDigitalasset,
    ledgerApiV2,
} from "@distrohelena/canton-typescript-sdk/protobuf";
import {
    classifyPruningPreflight,
    normalizePruningPreflightContext,
    normalizePruningSnapshot,
    parseLedgerEnd,
    parseRequiredPositiveExampleOffset,
} from "./pruning-preflight.js";
import { exampleTimeoutMs } from "./localnet.js";

type ExampleLogger = { log(message: string): void };

export interface PruningPreflightWorkflowDependencies {
    readonly client: Pick<CantonClient, "stateService" | "pruningService">;
    readonly environment: Readonly<Record<string, unknown>>;
    readonly createDeadline: (init: { timeoutMs: number }) => OperationDeadline;
    readonly timeoutMs: () => number;
    readonly logger: ExampleLogger;
}

export async function runPruningPreflightWorkflowAsync(
    dependencies: PruningPreflightWorkflowDependencies,
): Promise<void> {
    const deadline = dependencies.createDeadline({
        timeoutMs: dependencies.timeoutMs(),
    });

    const target = parseRequiredPositiveExampleOffset(dependencies.environment);

    const beforeResponse =
        await dependencies.client.stateService.getLatestPrunedOffsetsAsync(
            ledgerApiV2.GetLatestPrunedOffsetsRequest.create(),
            deadline.createRequestOptions(),
        );

    const before = normalizePruningSnapshot(beforeResponse);

    const ledgerEndResponse = await dependencies.client.stateService.getLedgerEndAsync(
        ledgerApiV2.GetLedgerEndRequest.create(),
        deadline.createRequestOptions(),
    );

    const ledgerEnd = parseLedgerEnd(ledgerEndResponse);

    const afterResponse =
        await dependencies.client.stateService.getLatestPrunedOffsetsAsync(
            ledgerApiV2.GetLatestPrunedOffsetsRequest.create(),
            deadline.createRequestOptions(),
        );

    const after = normalizePruningSnapshot(afterResponse);

    const classification = classifyPruningPreflight({
        target,
        before,
        ledgerEnd,
        after,
    });

    const schedule = await dependencies.client.pruningService.getScheduleAsync(
        comDigitalasset.canton.admin.pruning.v30.GetScheduleRequest.create(),
        deadline.createRequestOptions(),
    );

    const participantSchedule =
        await dependencies.client.pruningService.getParticipantScheduleAsync(
            comDigitalasset.canton.admin.pruning.v30.GetParticipantScheduleRequest.create(),
            deadline.createRequestOptions(),
        );

    const safePruning =
        await dependencies.client.pruningService.getSafePruningOffsetAsync(
            comDigitalasset.canton.admin.participant.v30.GetSafePruningOffsetRequest.create({
                ledgerEnd: ledgerEnd.text,
            }),
            deadline.createRequestOptions(),
        );

    const context = normalizePruningPreflightContext({
        schedule,
        participantSchedule,
        safePruning,
    });

    dependencies.logger.log(`Target offset: ${classification.target.text}`);
    dependencies.logger.log(
        `Before participant watermark: ${classification.beforeParticipantPrunedUpToInclusive.text}`,
    );
    dependencies.logger.log(
        `Before all-divulged watermark: ${classification.beforeAllDivulgedContractsPrunedUpToInclusive.text}`,
    );
    dependencies.logger.log(`Saved ledger end: ${classification.ledgerEnd.text}`);
    dependencies.logger.log(
        `After participant watermark: ${classification.afterParticipantPrunedUpToInclusive.text}`,
    );
    dependencies.logger.log(
        `After all-divulged watermark: ${classification.afterAllDivulgedContractsPrunedUpToInclusive.text}`,
    );
    dependencies.logger.log(`Classification: ${classification.kind}`);

    if (classification.kind === "notObservedPruned") {
        dependencies.logger.log(classification.caveat);
    }

    dependencies.logger.log(`Schedule configured: ${context.scheduleConfigured}`);
    dependencies.logger.log(
        `Participant schedule configured: ${context.participantScheduleConfigured}`,
    );

    if (context.pruneInternallyOnly !== undefined) {
        dependencies.logger.log(
            `Participant prune internally only: ${context.pruneInternallyOnly}`,
        );
    }

    dependencies.logger.log(`Safe pruning context: ${context.safePruning.kind}`);

    if (context.safePruning.kind === "safePruningOffset") {
        dependencies.logger.log(
            `Safe pruning offset: ${context.safePruning.offset.text}`,
        );
    }
}

export const pruningPreflightWorkflowDefaults = {
    environment: process.env,
    createDeadline: (init: { timeoutMs: number }) => new OperationDeadline(init),
    timeoutMs: exampleTimeoutMs,
};
