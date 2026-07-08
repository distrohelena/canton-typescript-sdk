import type { CantonClient } from "./canton-client.js";

export class ExternalPartyActivationRequest {
    public readonly partyId: string;
    public readonly synchronizerId: string;
    public readonly authorizingClients: readonly CantonClient[];
    public readonly activationTimeoutMs: number;
    public readonly pollIntervalMs: number;

    public constructor(init: {
        partyId: string;
        synchronizerId: string;
        authorizingClients?: readonly CantonClient[];
        activationTimeoutMs?: number;
        pollIntervalMs?: number;
    }) {
        this.partyId = init.partyId;
        this.synchronizerId = init.synchronizerId;
        this.authorizingClients = [...(init.authorizingClients ?? [])];
        this.activationTimeoutMs = init.activationTimeoutMs ?? 45_000;
        this.pollIntervalMs = init.pollIntervalMs ?? 500;
    }
}
