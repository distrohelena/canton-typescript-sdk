import { WaitCommitmentsSetup } from "../wait-commitments-setup.js";

export class GetNoWaitCommitmentsFromResponse {
    public readonly ignoredParticipants: readonly WaitCommitmentsSetup[];
    public readonly notIgnoredParticipants: readonly WaitCommitmentsSetup[];

    public constructor(init: {
        ignoredParticipants: readonly WaitCommitmentsSetup[];
        notIgnoredParticipants: readonly WaitCommitmentsSetup[];
    }) {
        this.ignoredParticipants = [...init.ignoredParticipants];
        this.notIgnoredParticipants = [...init.notIgnoredParticipants];
    }
}
