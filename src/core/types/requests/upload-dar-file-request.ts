export class UploadDarFileRequest {
    public readonly bytes: Uint8Array;

    public constructor(init: { bytes: Uint8Array }) {
        this.bytes = init.bytes;
    }
}
