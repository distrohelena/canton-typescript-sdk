import { HashFunction } from "../hash-function.js";

export class GetPackageResponse {
    public readonly hashFunction: HashFunction;
    public readonly archivePayload: Uint8Array;
    public readonly hash: string;

    public constructor(init: {
        hashFunction: HashFunction;
        archivePayload: Uint8Array;
        hash: string;
    }) {
        this.hashFunction = init.hashFunction;
        this.archivePayload = init.archivePayload;
        this.hash = init.hash;
    }
}
