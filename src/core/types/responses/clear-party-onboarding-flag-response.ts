export class ClearPartyOnboardingFlagResponse {
    public readonly onboarded: boolean;
    public readonly earliestRetryTimestamp?: Date;

    public constructor(init: {
        onboarded?: boolean;
        earliestRetryTimestamp?: Date;
    } = {}) {
        this.onboarded = init.onboarded ?? false;
        this.earliestRetryTimestamp = init.earliestRetryTimestamp;
    }
}
