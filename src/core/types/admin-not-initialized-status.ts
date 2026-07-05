import { AdminNotInitializedExternalInputKind } from "./admin-not-initialized-external-input-kind.js";

export class AdminNotInitializedStatus {
    public readonly active: boolean;
    public readonly waitingForExternalInput: AdminNotInitializedExternalInputKind;
    public readonly version: string;

    public constructor(init: {
        active: boolean;
        waitingForExternalInput: AdminNotInitializedExternalInputKind;
        version: string;
    }) {
        this.active = init.active;
        this.waitingForExternalInput = init.waitingForExternalInput;
        this.version = init.version;
    }
}
