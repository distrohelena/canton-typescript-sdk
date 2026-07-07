import { RegisteredSynchronizerConnectionGrpc } from "./registered-synchronizer-connection-grpc.js";

export class RegisteredSynchronizerConnection {
    public readonly alias: string;
    public readonly sequencerId?: string;
    public readonly grpc?: RegisteredSynchronizerConnectionGrpc;

    public constructor(init: {
        alias: string;
        sequencerId?: string;
        grpc?: RegisteredSynchronizerConnectionGrpc;
    }) {
        this.alias = init.alias;
        this.sequencerId = init.sequencerId;
        this.grpc = init.grpc;
    }
}
