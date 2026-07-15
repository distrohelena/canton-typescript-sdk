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
