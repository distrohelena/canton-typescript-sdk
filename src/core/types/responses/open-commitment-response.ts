export class OpenCommitmentResponse {
    public readonly chunk: Uint8Array;

    public constructor(init: {
        chunk?: Uint8Array;
    } = {}) {
        this.chunk = new Uint8Array(init.chunk ?? []);
    }
}
