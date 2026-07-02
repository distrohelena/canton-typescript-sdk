import {
  GrantUserRightsRequest,
  UserRightAssignment
} from "../../../core/types/requests/grantUserRightsRequest.js";
import { GrantUserRightsResponse } from "../../../core/types/responses/grantUserRightsResponse.js";
import { UserRightKind } from "../../../core/types/userRightKind.js";

export function mapGrpcGrantUserRightsRequest(request: GrantUserRightsRequest): {
  userId: string;
  rights: Array<{ type: string; party?: string }>;
} {
  return {
    userId: request.userId,
    rights: request.rights.map(right => ({
      type: right.type,
      party: right.party
    }))
  };
}

export function mapGrpcGrantUserRights(payload: {
  rights?: Array<{ type: string; party?: string }>;
}): GrantUserRightsResponse {
  const rights: UserRightAssignment[] = (payload.rights ?? []).map(right => ({
    type: right.type as UserRightKind,
    party: right.party
  }));

  return new GrantUserRightsResponse({ rights });
}
