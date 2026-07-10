import { IDamlLfReplayEffect } from "../../daml-lf/interpreter/daml-lf-trace-sink.interface.js";
import { ReplayDeterminismException } from "../errors/replay-determinism.exception.js";
import { IReplayTransactionSnapshot } from "./ledger-replay-environment-builder.js";

interface IObservedReplayEffect extends IDamlLfReplayEffect {}

export class ReplayDeterminismValidator {
    public validateOrThrow(
        snapshot: IReplayTransactionSnapshot,
        replayedEffects: readonly IDamlLfReplayEffect[],
    ): void {
        const observedEffects = this.collectObservedEffects(snapshot);

        if (observedEffects.length !== replayedEffects.length) {
            throw new ReplayDeterminismException(
                `replay produced ${replayedEffects.length} effects, but the ledger update exposed ${observedEffects.length}`,
            );
        }

        for (const [index, observedEffect] of observedEffects.entries()) {
            const replayedEffect = replayedEffects[index];

            if (
                replayedEffect === undefined
                || this.serializeEffect(observedEffect)
                    !== this.serializeEffect(replayedEffect)
            ) {
                throw new ReplayDeterminismException(
                    `replay diverged from the observed ledger effects at index ${index}`,
                );
            }
        }
    }

    private collectObservedEffects(
        snapshot: IReplayTransactionSnapshot,
    ): readonly IObservedReplayEffect[] {
        return snapshot.events.flatMap((event): IObservedReplayEffect[] => {
            switch (event.event?.oneofKind) {
                case "created":
                    return [
                        {
                            kind: "create",
                            contractId: event.event.created?.contractId,
                            templateId: event.event.created?.templateId,
                            payload: event.event.created?.createArguments,
                        },
                    ];
                case "exercised":
                    return [
                        {
                            kind: "exercise",
                            contractId: event.event.exercised?.contractId,
                            templateId: event.event.exercised?.templateId,
                            choice: event.event.exercised?.choice,
                            argument: event.event.exercised?.choiceArgument,
                        },
                    ];
                case "archived":
                    return [
                        {
                            kind: "archive",
                            contractId: event.event.archived?.contractId,
                            templateId: event.event.archived?.templateId,
                        },
                    ];
                default:
                    return [];
            }
        });
    }

    private serializeEffect(effect: IDamlLfReplayEffect): string {
        return JSON.stringify({
            kind: effect.kind,
            contractId: effect.contractId,
            templateId: effect.templateId,
            choice: effect.choice,
            argument: effect.argument,
            payload: effect.payload,
        });
    }
}
