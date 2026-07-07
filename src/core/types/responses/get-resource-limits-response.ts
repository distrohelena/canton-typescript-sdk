import { ResourceLimits } from "../resource-limits.js";

export class GetResourceLimitsResponse {
    public readonly currentLimits?: ResourceLimits;

    public constructor(init?: {
        currentLimits?: ResourceLimits;
    }) {
        this.currentLimits = init?.currentLimits;
    }
}
