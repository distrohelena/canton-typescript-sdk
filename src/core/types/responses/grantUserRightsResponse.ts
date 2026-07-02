import { UserRightAssignment } from "../requests/grantUserRightsRequest.js";

export class GrantUserRightsResponse {
  public readonly rights: readonly UserRightAssignment[];

  public constructor(init: { rights: readonly UserRightAssignment[] }) {
    this.rights = init.rights;
  }
}
