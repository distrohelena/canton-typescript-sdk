export class AdminTopologyQueueStatus {
    public readonly manager: number;
    public readonly dispatcher: number;
    public readonly clients: number;

    public constructor(init: {
        manager: number;
        dispatcher: number;
        clients: number;
    }) {
        this.manager = init.manager;
        this.dispatcher = init.dispatcher;
        this.clients = init.clients;
    }
}
