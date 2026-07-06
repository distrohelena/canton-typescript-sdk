export class DynamicSequencingParameters {
    public readonly payload: Uint8Array;

    public constructor(init: {
        payload?: Uint8Array;
    } = {}) {
        this.payload = new Uint8Array(init.payload ?? []);
    }
}
