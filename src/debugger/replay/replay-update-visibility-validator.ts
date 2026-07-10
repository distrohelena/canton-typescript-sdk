import { ReplayUnsupportedUpdateException } from "../errors/replay-unsupported-update.exception.js";

type ReplayLikeEvent = {
    event?: {
        oneofKind?: string;
        created?: {
            templateId?: unknown;
            createArguments?: unknown;
        };
        exercised?: {
            templateId?: unknown;
            contractId?: string;
            choice?: string;
            choiceArgument?: unknown;
        };
    };
};

export function validateReplayVisibilityOrThrow(update: {
    events?: ReplayLikeEvent[];
}): void {
    for (const event of update.events ?? []) {
        if (event.event?.oneofKind === "created") {
            if (
                event.event.created?.templateId === undefined ||
                event.event.created.createArguments === undefined
            ) {
                throw new ReplayUnsupportedUpdateException(
                    "created events must include template id and create arguments for replay",
                );
            }
        }

        if (event.event?.oneofKind === "exercised") {
            if (
                event.event.exercised?.templateId === undefined ||
                event.event.exercised.contractId === undefined ||
                event.event.exercised.choice === undefined ||
                event.event.exercised.choiceArgument === undefined
            ) {
                throw new ReplayUnsupportedUpdateException(
                    "exercised events must include template id, contract id, choice, and choice argument for replay",
                );
            }
        }
    }
}
