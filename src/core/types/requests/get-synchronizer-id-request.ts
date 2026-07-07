export class GetSynchronizerIdRequest {
    public readonly synchronizerAlias: string;

    public constructor(init: {
        synchronizerAlias: string;
    }) {
        this.synchronizerAlias = init.synchronizerAlias;
    }
}
