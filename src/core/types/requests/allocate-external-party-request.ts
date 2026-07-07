import { ExternalPartyOnboardingTransaction } from "../external-party/external-party-onboarding-transaction.js";
import { ExternalPartySignature } from "../external-party/external-party-signature.js";

export class AllocateExternalPartyRequest {
    public readonly synchronizer: string;
    public readonly onboardingTransactions: ExternalPartyOnboardingTransaction[];
    public readonly multiHashSignatures: ExternalPartySignature[];
    public readonly identityProviderId?: string;
    public readonly waitForAllocation?: boolean;
    public readonly userId?: string;

    public constructor(
        init: {
            synchronizer?: string;
            onboardingTransactions?: ExternalPartyOnboardingTransaction[];
            multiHashSignatures?: ExternalPartySignature[];
            identityProviderId?: string;
            waitForAllocation?: boolean;
            userId?: string;
        } = {},
    ) {
        this.synchronizer = init.synchronizer ?? "";
        this.onboardingTransactions = [...(init.onboardingTransactions ?? [])];
        this.multiHashSignatures = [...(init.multiHashSignatures ?? [])];
        this.identityProviderId = init.identityProviderId;
        this.waitForAllocation = init.waitForAllocation;
        this.userId = init.userId;
    }
}
