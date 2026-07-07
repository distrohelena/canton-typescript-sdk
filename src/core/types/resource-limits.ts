export class ResourceLimits {
    public readonly maxInflightValidationRequests?: number;
    public readonly maxSubmissionRate?: number;
    public readonly maxSubmissionBurstFactor: number;

    public constructor(init?: {
        maxInflightValidationRequests?: number;
        maxSubmissionRate?: number;
        maxSubmissionBurstFactor?: number;
    }) {
        this.maxInflightValidationRequests =
            init?.maxInflightValidationRequests;
        this.maxSubmissionRate = init?.maxSubmissionRate;
        this.maxSubmissionBurstFactor =
            init?.maxSubmissionBurstFactor ?? 0;
    }
}
