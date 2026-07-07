export class GetEventsByContractIdRequest {
    public readonly contractId: string;
    public readonly eventFormat?: Record<string, unknown>;

    public constructor(init: {
        contractId: string;
        eventFormat?: Record<string, unknown>;
    }) {
        this.contractId = init.contractId;
        this.eventFormat = init.eventFormat;
    }
}
