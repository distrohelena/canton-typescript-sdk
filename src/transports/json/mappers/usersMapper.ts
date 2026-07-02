import { GrantUserRightsResponse } from "../../../core/types/responses/grantUserRightsResponse.js";
import { UserRightAssignment } from "../../../core/types/requests/grantUserRightsRequest.js";
import { UserRightKind } from "../../../core/types/userRightKind.js";

export function mapJsonGrantRights(payload: {
  result?: Array<{ type: string; party?: string }>;
}): GrantUserRightsResponse {
  const rights: UserRightAssignment[] = (payload.result ?? []).map(right => ({
    type: right.type as UserRightKind,
    party: right.party
  }));

  return new GrantUserRightsResponse({ rights });
}
