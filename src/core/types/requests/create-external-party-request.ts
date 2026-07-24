import { ValidationError } from "../../errors/validation-error.js";
import { ExternalPartySignatureFormat } from "../external-party/external-party-signature-format.js";
import { ExternalPartySigningAlgorithmSpec } from "../external-party/external-party-signing-algorithm-spec.js";
import { ExternalPartySigningPublicKey } from "../external-party/external-party-signing-public-key.js";

export type ExternalPartySigningPayloadKind =
    | "topology-transaction"
    | "multi-hash";

export interface ExternalPartySigningRequest {
    readonly payload: Uint8Array;
    readonly kind: ExternalPartySigningPayloadKind;
    readonly partyId: string;
    readonly publicKeyFingerprint: string;
}

export interface ExternalPartySigningResult {
    readonly signature: Uint8Array;
    readonly format: ExternalPartySignatureFormat;
    readonly signingAlgorithmSpec: ExternalPartySigningAlgorithmSpec;
}

export type ExternalPartySigner = (
    request: ExternalPartySigningRequest,
) => Promise<ExternalPartySigningResult>;

export class CreateExternalPartyRequest {
    public readonly synchronizer: string;
    public readonly partyHint: string;
    public readonly publicKey: ExternalPartySigningPublicKey;
    public readonly localParticipantObservationOnly: boolean;
    public readonly otherConfirmingParticipantUids: readonly string[];
    public readonly confirmationThreshold: number;
    public readonly observingParticipantUids: readonly string[];
    public readonly identityProviderId?: string;
    public readonly waitForAllocation?: boolean;
    public readonly userId?: string;
    public readonly sign: ExternalPartySigner;

    public constructor(init: {
        synchronizer?: string;
        partyHint?: string;
        publicKey?: ExternalPartySigningPublicKey;
        localParticipantObservationOnly?: boolean;
        otherConfirmingParticipantUids?: readonly string[];
        confirmationThreshold?: number;
        observingParticipantUids?: readonly string[];
        identityProviderId?: string;
        waitForAllocation?: boolean;
        userId?: string;
        sign?: ExternalPartySigner;
    }) {
        if (init.synchronizer === undefined || init.synchronizer.length === 0) {
            throw new ValidationError("external party creation requires a synchronizer");
        }

        if (init.partyHint === undefined || init.partyHint.length === 0) {
            throw new ValidationError("external party creation requires a party hint");
        }

        if (init.publicKey === undefined || init.publicKey.keyData.length === 0) {
            throw new ValidationError("external party creation requires public key material");
        }

        if (init.sign === undefined) {
            throw new ValidationError("external party creation requires a signer");
        }

        this.synchronizer = init.synchronizer;
        this.partyHint = init.partyHint;
        this.publicKey = new ExternalPartySigningPublicKey({
            format: init.publicKey.format,
            keyData: init.publicKey.keyData,
            keySpec: init.publicKey.keySpec,
        });
        this.localParticipantObservationOnly =
            init.localParticipantObservationOnly ?? false;
        this.otherConfirmingParticipantUids = [
            ...(init.otherConfirmingParticipantUids ?? []),
        ];
        this.confirmationThreshold = init.confirmationThreshold ?? 0;
        this.observingParticipantUids = [...(init.observingParticipantUids ?? [])];
        this.identityProviderId = init.identityProviderId;
        this.waitForAllocation = init.waitForAllocation;
        this.userId = init.userId;
        this.sign = init.sign;
    }
}
