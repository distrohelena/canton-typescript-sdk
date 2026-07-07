export class GetContractResponse<TCreatedEvent = unknown> {
    public readonly createdEvent?: TCreatedEvent;

    public constructor(init: { createdEvent?: TCreatedEvent }) {
        this.createdEvent = init.createdEvent;
    }
}
