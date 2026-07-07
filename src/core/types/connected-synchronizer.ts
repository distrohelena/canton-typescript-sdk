import { ParticipantPermission } from "./topology/participant-permission.js";

export class ConnectedSynchronizer {
    public readonly synchronizerAlias: string;
    public readonly synchronizerId: string;
    public readonly permission: ParticipantPermission;

    public constructor(init: {
        synchronizerAlias: string;
        synchronizerId: string;
        permission?: ParticipantPermission;
    }) {
        this.synchronizerAlias = init.synchronizerAlias;
        this.synchronizerId = init.synchronizerId;
        this.permission = init.permission ?? ParticipantPermission.unspecified;
    }
}
