import { ValidationError } from "../../errors/validation-error.js";
import { computeCantonPublicKeyFingerprint } from "../../hashing/canton-hash.js";
import { ExternalPartySigningPublicKey } from "../external-party/external-party-signing-public-key.js";

export interface DecentralizedPartyKey {
    readonly publicKey: ExternalPartySigningPublicKey;
}

export class CreateDecentralizedPartyRequest {
    public readonly synchronizer: string;
    public readonly partyHint: string;
    public readonly owners: readonly DecentralizedPartyKey[];
    public readonly ownerThreshold: number;
    public readonly partySigningKeys: readonly DecentralizedPartyKey[];
    public readonly partySigningThreshold: number;
    public readonly localParticipantObservationOnly: boolean;
    public readonly otherConfirmingParticipantUids: readonly string[];
    public readonly confirmationThreshold: number;
    public readonly observingParticipantUids: readonly string[];
    public readonly identityProviderId?: string;
    public readonly waitForAllocation?: boolean;
    public readonly userId?: string;

    public constructor(init: {
        synchronizer?: string;
        partyHint?: string;
        owners?: readonly DecentralizedPartyKey[];
        ownerThreshold?: number;
        partySigningKeys?: readonly DecentralizedPartyKey[];
        partySigningThreshold?: number;
        localParticipantObservationOnly?: boolean;
        otherConfirmingParticipantUids?: readonly string[];
        confirmationThreshold?: number;
        observingParticipantUids?: readonly string[];
        identityProviderId?: string;
        waitForAllocation?: boolean;
        userId?: string;
    }) {
        const owners = [...(init.owners ?? [])];
        const partySigningKeys = [...(init.partySigningKeys ?? [])];

        if (init.synchronizer === undefined || init.synchronizer.length === 0) {
            throw new ValidationError("decentralized party creation requires a synchronizer");
        } else if (init.partyHint === undefined || init.partyHint.length === 0) {
            throw new ValidationError("decentralized party creation requires a party hint");
        } else if (owners.length < 2) {
            throw new ValidationError("decentralized party creation requires at least two unique owner keys");
        } else if (partySigningKeys.length === 0) {
            throw new ValidationError("decentralized party creation requires at least one party signing key");
        } else if (init.ownerThreshold === undefined) {
            throw new ValidationError("decentralized party creation requires an owner threshold");
        } else if (init.partySigningThreshold === undefined) {
            throw new ValidationError("decentralized party creation requires a party signing threshold");
        } else if (init.ownerThreshold < 1 || init.ownerThreshold > owners.length) {
            throw new ValidationError("decentralized party owner threshold must be within the owner key count");
        } else if (init.partySigningThreshold < 1 || init.partySigningThreshold > partySigningKeys.length) {
            throw new ValidationError("decentralized party signing threshold must be within the party signing key count");
        }

        validateUniqueKeys(owners, "owner");
        validateUniqueKeys(partySigningKeys, "party signing");

        this.synchronizer = init.synchronizer;
        this.partyHint = init.partyHint;
        this.owners = owners.map(cloneKey);
        this.ownerThreshold = init.ownerThreshold;
        this.partySigningKeys = partySigningKeys.map(cloneKey);
        this.partySigningThreshold = init.partySigningThreshold;
        this.localParticipantObservationOnly = init.localParticipantObservationOnly ?? false;
        this.otherConfirmingParticipantUids = [...(init.otherConfirmingParticipantUids ?? [])];
        this.confirmationThreshold = init.confirmationThreshold ?? 0;
        this.observingParticipantUids = [...(init.observingParticipantUids ?? [])];
        this.identityProviderId = init.identityProviderId;
        this.waitForAllocation = init.waitForAllocation;
        this.userId = init.userId;
    }
}

function cloneKey(value: DecentralizedPartyKey): DecentralizedPartyKey {
    return {
        publicKey: new ExternalPartySigningPublicKey({
            format: value.publicKey.format,
            keyData: value.publicKey.keyData,
            keySpec: value.publicKey.keySpec,
        }),
    };
}

function validateUniqueKeys(
    values: readonly DecentralizedPartyKey[],
    label: string,
): void {
    const fingerprints = values.map((value) => {
        if (value.publicKey.keyData.length === 0) {
            throw new ValidationError(`decentralized party ${label} key requires public key material`);
        }

        return computeCantonPublicKeyFingerprint(
            value.publicKey.keyData,
            value.publicKey.format,
        );
    });

    if (new Set(fingerprints).size !== fingerprints.length) {
        throw new ValidationError(`decentralized party ${label} keys must be unique`);
    }
}
