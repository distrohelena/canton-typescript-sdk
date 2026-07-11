import { IDamlLfReplayEffect } from "../../daml-lf/interpreter/daml-lf-trace-sink.interface.js";
import {
    DAML_LF_PARTY_MARKER_KEY,
    DAML_LF_RECORD_ID_MARKER_KEY,
} from "../../daml-lf/interpreter/daml-lf-runtime-value.js";
import { ReplayDeterminismException } from "../errors/replay-determinism.exception.js";
import { IReplayTransactionSnapshot } from "./ledger-replay-environment-builder.js";
import { normalizeReplayLedgerValue } from "./replay-ledger-value-normalizer.js";

interface IObservedReplayEffect extends IDamlLfReplayEffect {}

export class ReplayDeterminismValidator {
    public validateOrThrow(
        snapshot: IReplayTransactionSnapshot,
        replayedEffects: readonly IDamlLfReplayEffect[],
    ): void {
        const observedEffects = this.collectObservedEffects(snapshot);
        const comparableReplayedEffects =
            this.collectComparableReplayedEffects(replayedEffects);
        const syntheticCreateContractIds = new Map<string, string>();
        let createIndex = 0;

        if (observedEffects.length !== comparableReplayedEffects.length) {
            throw new ReplayDeterminismException(
                `replay produced ${comparableReplayedEffects.length} effects, but the ledger update exposed ${observedEffects.length}`,
            );
        }

        for (const [index, observedEffect] of observedEffects.entries()) {
            const replayedEffect = comparableReplayedEffects[index];

            if (
                replayedEffect === undefined
                || !this.effectsEqual(
                    observedEffect,
                    replayedEffect,
                    syntheticCreateContractIds,
                )
            ) {
                throw new ReplayDeterminismException(
                    `replay diverged from the observed ledger effects at index ${index}: observed=${this.serializeEffect(observedEffect)} replayed=${replayedEffect === undefined ? "undefined" : this.serializeEffect(replayedEffect)}`,
                );
            }

            if (
                observedEffect.kind === "create"
                && observedEffect.contractId !== undefined
            ) {
                createIndex += 1;
                syntheticCreateContractIds.set(
                    `created-${createIndex}`,
                    observedEffect.contractId,
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
                            payload: normalizeReplayLedgerValue(
                                event.event.created?.createArguments,
                            ),
                        },
                    ];
                case "exercised":
                    return [
                        {
                            kind: "exercise",
                            contractId: event.event.exercised?.contractId,
                            templateId: event.event.exercised?.templateId,
                            choice: event.event.exercised?.choice,
                            argument: normalizeReplayLedgerValue(
                                event.event.exercised?.choiceArgument,
                            ),
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

    private collectComparableReplayedEffects(
        replayedEffects: readonly IDamlLfReplayEffect[],
    ): readonly IDamlLfReplayEffect[] {
        return replayedEffects.filter(
            (effect) =>
                effect.kind === "create"
                || effect.kind === "exercise"
                || effect.kind === "archive",
        );
    }

    private serializeEffect(effect: IDamlLfReplayEffect): string {
        return JSON.stringify({
            kind: effect.kind,
            contractId:
                effect.kind === "create" ? undefined : effect.contractId,
            templateId: effect.templateId,
            choice: effect.choice,
            argument: this.normalizeComparableValue(effect.argument),
            payload: this.normalizeComparableValue(effect.payload),
        });
    }

    private effectsEqual(
        left: IDamlLfReplayEffect,
        right: IDamlLfReplayEffect,
        syntheticCreateContractIds: ReadonlyMap<string, string>,
    ): boolean {
        return (
            left.kind === right.kind
            && this.normalizeComparableContractId(
                left.kind,
                left.contractId,
                syntheticCreateContractIds,
            )
                === this.normalizeComparableContractId(
                    right.kind,
                    right.contractId,
                    syntheticCreateContractIds,
                )
            && this.valuesEqual(left.templateId, right.templateId)
            && left.choice === right.choice
            && this.valuesEqual(
                this.normalizeComparableValue(left.argument),
                this.normalizeComparableValue(right.argument),
            )
            && this.valuesEqual(
                this.normalizeComparableValue(left.payload),
                this.normalizeComparableValue(right.payload),
            )
        );
    }

    private normalizeComparableContractId(
        kind: IDamlLfReplayEffect["kind"],
        contractId: string | undefined,
        syntheticCreateContractIds: ReadonlyMap<string, string>,
    ): string | undefined {
        if (kind === "create") {
            return undefined;
        }

        return contractId === undefined
            ? undefined
            : syntheticCreateContractIds.get(contractId) ?? contractId;
    }

    private valuesEqual(left: unknown, right: unknown): boolean {
        if (Array.isArray(left) || Array.isArray(right)) {
            return (
                Array.isArray(left)
                && Array.isArray(right)
                && left.length === right.length
                && left.every((item, index) =>
                    this.valuesEqual(item, right[index]),
                )
            );
        }

        if (
            left !== null
            && right !== null
            && typeof left === "object"
            && typeof right === "object"
        ) {
            const leftEntries = Object.entries(left);
            const rightEntries = Object.entries(right);
            const leftKeys = leftEntries.map(([key]) => key);
            const rightKeys = rightEntries.map(([key]) => key);
            const leftIsPositional = leftKeys.every((key) => /^\d+$/.test(key));
            const rightIsPositional = rightKeys.every((key) => /^\d+$/.test(key));

            if (leftIsPositional !== rightIsPositional) {
                const positionalEntries = leftIsPositional ? leftEntries : rightEntries;
                const namedEntries = leftIsPositional ? rightEntries : leftEntries;

                return (
                    positionalEntries.length === namedEntries.length
                    && positionalEntries
                        .sort(
                            ([leftKey], [rightKey]) =>
                                Number(leftKey) - Number(rightKey),
                        )
                        .every(([, value], index) =>
                            this.valuesEqual(value, namedEntries[index]?.[1]),
                        )
                );
            }

            const leftSortedKeys = [...leftKeys].sort();
            const rightSortedKeys = [...rightKeys].sort();

            return (
                leftSortedKeys.length === rightSortedKeys.length
                && leftSortedKeys.every(
                    (key, index) => key === rightSortedKeys[index],
                )
                && leftSortedKeys.every((key) =>
                    this.valuesEqual(
                        (left as Record<string, unknown>)[key],
                        (right as Record<string, unknown>)[key],
                    ),
                )
            );
        }

        return Object.is(left, right);
    }

    private normalizeComparableValue(value: unknown): unknown {
        if (
            typeof value === "string"
            && /^-?\d+\.\d+$/.test(value)
        ) {
            const normalizedValue = value
                .replace(/(\.\d*?[1-9])0+$/, "$1")
                .replace(/\.0+$/, "");

            return normalizedValue === "-0" ? "0" : normalizedValue;
        }

        if (Array.isArray(value)) {
            return value.map((item) => this.normalizeComparableValue(item));
        }

        if (
            value !== null
            && typeof value === "object"
            && DAML_LF_PARTY_MARKER_KEY in value
            && typeof value[DAML_LF_PARTY_MARKER_KEY] === "string"
        ) {
            return value[DAML_LF_PARTY_MARKER_KEY];
        }

        if (value !== null && typeof value === "object") {
            return Object.fromEntries(
                Object.entries(value)
                    .filter(
                        ([key, item]) =>
                            key !== DAML_LF_RECORD_ID_MARKER_KEY
                            && item !== null
                            && item !== undefined,
                    )
                    .map(([key, item]) => [
                        key,
                        this.normalizeComparableValue(item),
                    ]),
            );
        }

        return value;
    }
}
