import { ValidationError } from "../../errors/validation-error.js";

export class WaitForPartyHostingRequest {
    public readonly partyId: string;
    public readonly participantId: string;
    public readonly synchronizerId: string;
    public readonly pollIntervalMs: number;
    public readonly timeoutMs: number;

    public constructor(init: {
        partyId: string;
        participantId: string;
        synchronizerId: string;
        pollIntervalMs?: number;
        timeoutMs?: number;
    }) {
        const partyId = init.partyId.trim();

        const participantId = init.participantId.trim();

        const synchronizerId = init.synchronizerId.trim();

        const pollIntervalMs = init.pollIntervalMs ?? 500;

        const timeoutMs = init.timeoutMs ?? 30_000;

        if (!partyId) {
            throw new ValidationError("party hosting wait requires a party ID");
        } else if (!participantId) {
            throw new ValidationError(
                "party hosting wait requires a participant ID",
            );
        } else if (!synchronizerId) {
            throw new ValidationError(
                "party hosting wait requires a synchronizer ID",
            );
        } else if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
            throw new ValidationError(
                "party hosting wait timeout must be a positive safe integer",
            );
        } else if (
            !Number.isSafeInteger(pollIntervalMs) ||
            pollIntervalMs < 0
        ) {
            throw new ValidationError(
                "party hosting wait poll interval must be a non-negative safe integer",
            );
        }

        this.partyId = partyId;
        this.participantId = participantId;
        this.synchronizerId = synchronizerId;
        this.pollIntervalMs = pollIntervalMs;
        this.timeoutMs = timeoutMs;
    }
}
