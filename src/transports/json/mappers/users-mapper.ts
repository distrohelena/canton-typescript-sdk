import { GrantUserRightsResponse } from "../../../core/types/responses/grant-user-rights-response.js";
import { UserRightAssignment } from "../../../core/types/requests/grant-user-rights-request.js";
import { UserRightKind } from "../../../core/types/user-right-kind.js";

export function mapJsonGrantRights(payload: {
    result?: Array<{ type: string; party?: string }>;
}): GrantUserRightsResponse {
    const rights: UserRightAssignment[] = (payload.result ?? []).map(
        (right) => ({
            type: right.type as UserRightKind,
            party: right.party,
        }),
    );

    return new GrantUserRightsResponse({ rights });
}
