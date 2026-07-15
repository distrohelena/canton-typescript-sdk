import * as fc from "fast-check";

import {
    CampaignMetricOutcome,
    CampaignMetrics,
    createCampaignMetrics,
    recordCampaignAction,
} from "./campaign-metrics.js";

export interface CampaignInvariantFailure {
    readonly code: string;
    readonly invariant: string;
    readonly message: string;
}

export async function evaluateCampaignInvariantsAsync(init: readonly {
    readonly check: () => Promise<
        | { readonly code: string; readonly message: string }
        | undefined
    >;
    readonly name: string;
}[]): Promise<readonly CampaignInvariantFailure[]> {
    const failures: CampaignInvariantFailure[] = [];

    for (const invariant of init) {
        try {
            const failure = await invariant.check();

            if (failure !== undefined) {
                failures.push({ invariant: invariant.name, ...failure });
            }
        } catch (error) {
            failures.push({
                invariant: invariant.name,
                code: "thrown",
                message: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return failures;
}

export async function runCampaignCheckAsync<Input, Trace>(init: {
    readonly arbitrary: fc.Arbitrary<Input>;
    readonly executeAsync: (input: Input) => Promise<{
        readonly passed: boolean;
        readonly trace: Trace;
    }>;
    readonly key: (input: Input) => string;
    readonly numRuns: number;
    readonly seed?: number;
}): Promise<{
    readonly counterexampleTrace?: Trace;
    readonly details: fc.RunDetails<[Input]>;
}> {
    const traces = new Map<string, Trace>();

    const details = await fc.check(
        fc.asyncProperty(init.arbitrary, async (input) => {
            const result = await init.executeAsync(input);

            traces.set(init.key(input), result.trace);

            return result.passed;
        }),
        {
            numRuns: init.numRuns,
            ...(init.seed === undefined ? {} : { seed: init.seed }),
        },
    );

    const counterexample = details.counterexample?.[0];

    return {
        details,
        ...(counterexample === undefined
            ? {}
            : { counterexampleTrace: traces.get(init.key(counterexample)) }),
    };
}

export interface CampaignExecutableAction {
    readonly actor: string;
    readonly targetKey: string;
}

export type CampaignLifecyclePhase<Action> =
    | { readonly kind: "before-run" }
    | { readonly action: Action; readonly kind: "after-action" }
    | { readonly kind: "after-run" }
    | { readonly kind: "post-cleanup" };

export interface CampaignLifecycleTrace<Action> {
    readonly actions: readonly {
        readonly action: Action;
        readonly outcome: CampaignMetricOutcome;
    }[];
    readonly failures: readonly CampaignInvariantFailure[];
    readonly metrics: CampaignMetrics;
    readonly failureKind?: "execution-error" | "invalid-depth";
}

/**
 * Runs generated fixed-depth action sequences with Foundry-style revert
 * handling. Runtime-specific setup, reconciliation, and cleanup stay in
 * caller-provided hooks so this remains usable with any ledger adapter.
 */
export async function runCampaignLifecycleCheckAsync<
    Context,
    Action extends CampaignExecutableAction,
>(init: {
    readonly arbitrary: fc.Arbitrary<readonly Action[]>;
    readonly checkInvariantsAsync?: (
        context: Context,
        phase: CampaignLifecyclePhase<Action>,
    ) => Promise<readonly CampaignInvariantFailure[]>;
    readonly cleanupAsync?: (context: Context) => Promise<void>;
    readonly depth: number;
    readonly executeAsync: (
        context: Context,
        action: Action,
    ) => Promise<CampaignMetricOutcome>;
    readonly failOnRevert: boolean;
    readonly key: (actions: readonly Action[]) => string;
    readonly numRuns: number;
    readonly reconcileAsync?: (
        context: Context,
        phase: CampaignLifecyclePhase<Action>,
    ) => Promise<void>;
    readonly seed?: number;
    readonly setupAsync: () => Promise<Context>;
}): Promise<{
    readonly counterexampleTrace?: CampaignLifecycleTrace<Action>;
    readonly details: fc.RunDetails<[readonly Action[]]>;
}> {
    return runCampaignCheckAsync({
        arbitrary: init.arbitrary,
        key: init.key,
        numRuns: init.numRuns,
        seed: init.seed,
        executeAsync: async (actions) => runCampaignCandidateAsync(init, actions),
    });
}

async function runCampaignCandidateAsync<
    Context,
    Action extends CampaignExecutableAction,
>(
    init: {
        readonly checkInvariantsAsync?: (
            context: Context,
            phase: CampaignLifecyclePhase<Action>,
        ) => Promise<readonly CampaignInvariantFailure[]>;
        readonly cleanupAsync?: (context: Context) => Promise<void>;
        readonly depth: number;
        readonly executeAsync: (
            context: Context,
            action: Action,
        ) => Promise<CampaignMetricOutcome>;
        readonly failOnRevert: boolean;
        readonly reconcileAsync?: (
            context: Context,
            phase: CampaignLifecyclePhase<Action>,
        ) => Promise<void>;
        readonly setupAsync: () => Promise<Context>;
    },
    actions: readonly Action[],
): Promise<{ readonly passed: boolean; readonly trace: CampaignLifecycleTrace<Action> }> {
    const metrics = createCampaignMetrics();

    const executed: {
        action: Action;
        outcome: CampaignMetricOutcome;
    }[] = [];

    const failures: CampaignInvariantFailure[] = [];

    let context: Context | undefined;

    let failureKind: CampaignLifecycleTrace<Action>["failureKind"];

    let passed = true;

    if (actions.length !== init.depth) {
        return {
            passed: false,
            trace: {
                actions: [],
                failures: [],
                metrics,
                failureKind: "invalid-depth",
            },
        };
    }

    const checkInvariantsAsync = async (phase: CampaignLifecyclePhase<Action>): Promise<void> => {
        if (context === undefined || init.checkInvariantsAsync === undefined) {
            return;
        }

        const phaseFailures = await init.checkInvariantsAsync(context, phase);

        failures.push(...phaseFailures);

        if (phaseFailures.length > 0) {
            passed = false;
        }
    };

    try {
        context = await init.setupAsync();

        const beforeRun = { kind: "before-run" } as const;

        await init.reconcileAsync?.(context, beforeRun);
        await checkInvariantsAsync(beforeRun);

        for (const action of actions) {
            if (!passed) {
                break;
            }

            let outcome: CampaignMetricOutcome;

            try {
                outcome = await init.executeAsync(context, action);
            } catch {
                outcome = {
                    kind: "transport-error",
                    reason: "Campaign action execution threw an error.",
                };
            }

            executed.push({ action, outcome });
            recordCampaignAction(metrics, {
                actor: action.actor,
                targetKey: action.targetKey,
                outcome,
            });

            const afterAction = { kind: "after-action", action } as const;

            if (outcome.kind === "accepted") {
                await init.reconcileAsync?.(context, afterAction);
            }

            await checkInvariantsAsync(afterAction);

            if (
                outcome.kind !== "accepted"
                && (outcome.kind !== "protocol-revert" || init.failOnRevert)
            ) {
                passed = false;
            }
        }

        if (passed) {
            await checkInvariantsAsync({ kind: "after-run" });
        }
    } catch {
        passed = false;
        failureKind = "execution-error";
    } finally {
        if (context !== undefined) {
            try {
                await init.cleanupAsync?.(context);
            } catch {
                passed = false;
                failureKind ??= "execution-error";
            }

            try {
                await checkInvariantsAsync({ kind: "post-cleanup" });
            } catch {
                passed = false;
                failureKind ??= "execution-error";
            }
        }
    }

    return {
        passed,
        trace: {
            actions: Object.freeze(executed.map((entry) => Object.freeze(entry))),
            failures: Object.freeze(failures.map((failure) => Object.freeze({ ...failure }))),
            metrics,
            ...(failureKind === undefined ? {} : { failureKind }),
        },
    };
}
