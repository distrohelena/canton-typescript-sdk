import { ObjectMeta } from "./object-meta.js";

export class LedgerUser {
    public readonly id: string;
    public readonly primaryParty?: string;
    public readonly isDeactivated: boolean;
    public readonly metadata?: ObjectMeta;
    public readonly identityProviderId?: string;
    public readonly primaryPartyAuthentication: boolean;

    public constructor(init: {
        id: string;
        primaryParty?: string;
        isDeactivated?: boolean;
        metadata?: ObjectMeta;
        identityProviderId?: string;
        primaryPartyAuthentication?: boolean;
    }) {
        this.id = init.id;
        this.primaryParty = init.primaryParty;
        this.isDeactivated = init.isDeactivated ?? false;
        this.metadata = init.metadata;
        this.identityProviderId = init.identityProviderId;
        this.primaryPartyAuthentication =
            init.primaryPartyAuthentication ?? false;
    }
}
