import { ExternalPartySigningPublicKey } from "../external-party/external-party-signing-public-key.js";

export class GenerateExternalPartyTopologyRequest {
    public readonly synchronizer: string;
    public readonly partyHint: string;
    public readonly publicKey?: ExternalPartySigningPublicKey;
    public readonly localParticipantObservationOnly: boolean;
    public readonly otherConfirmingParticipantUids: string[];
    public readonly confirmationThreshold: number;
    public readonly observingParticipantUids: string[];

    public constructor(
        init: {
            synchronizer?: string;
            partyHint?: string;
            publicKey?: ExternalPartySigningPublicKey;
            localParticipantObservationOnly?: boolean;
            otherConfirmingParticipantUids?: string[];
            confirmationThreshold?: number;
            observingParticipantUids?: string[];
        } = {},
    ) {
        this.synchronizer = init.synchronizer ?? "";
        this.partyHint = init.partyHint ?? "";
        this.publicKey = init.publicKey;
        this.localParticipantObservationOnly =
            init.localParticipantObservationOnly ?? false;
        this.otherConfirmingParticipantUids = [
            ...(init.otherConfirmingParticipantUids ?? []),
        ];
        this.confirmationThreshold = init.confirmationThreshold ?? 0;
        this.observingParticipantUids = [...(init.observingParticipantUids ?? [])];
    }
}
