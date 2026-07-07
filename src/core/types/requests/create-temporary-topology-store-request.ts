export class CreateTemporaryTopologyStoreRequest {
    public readonly name: string;
    public readonly protocolVersion: number;

    public constructor(init: {
        name?: string;
        protocolVersion?: number;
    } = {}) {
        this.name = init.name ?? "";
        this.protocolVersion = init.protocolVersion ?? 0;
    }
}
