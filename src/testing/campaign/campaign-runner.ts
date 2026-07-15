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
        { numRuns: init.numRuns },
    );

    const counterexample = details.counterexample?.[0];

    return {
        details,
        ...(counterexample === undefined
            ? {}
            : { counterexampleTrace: traces.get(init.key(counterexample)) }),
    };
}
import * as fc from "fast-check";
