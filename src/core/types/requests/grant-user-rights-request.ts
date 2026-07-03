import { UserRightKind } from "../user-right-kind.js";

export interface UserRightAssignment {
    readonly type: UserRightKind;
    readonly party?: string;
}

export class GrantUserRightsRequest {
    public readonly userId: string;
    public readonly rights: readonly UserRightAssignment[];

    public constructor(init: {
        userId: string;
        rights: readonly UserRightAssignment[];
    }) {
        this.userId = init.userId;
        this.rights = init.rights;
    }
}
