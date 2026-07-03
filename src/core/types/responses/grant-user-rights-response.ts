import { UserRightAssignment } from "../requests/grant-user-rights-request.js";

export class GrantUserRightsResponse {
    public readonly rights: readonly UserRightAssignment[];

    public constructor(init: { rights: readonly UserRightAssignment[] }) {
        this.rights = init.rights;
    }
}
