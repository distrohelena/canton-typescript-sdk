import {
    GrantUserRightsRequest,
    UserRightAssignment,
} from "../../../core/types/requests/grant-user-rights-request.js";
import { GrantUserRightsResponse } from "../../../core/types/responses/grant-user-rights-response.js";
import { UserRightKind } from "../../../core/types/user-right-kind.js";

export function mapGrpcGrantUserRightsRequest(
    request: GrantUserRightsRequest,
): {
    userId: string;
    rights: Array<{ type: string; party?: string }>;
} {
    return {
        userId: request.userId,
        rights: request.rights.map((right) => ({
            type: right.type,
            party: right.party,
        })),
    };
}

export function mapGrpcGrantUserRights(payload: {
    rights?: Array<{ type: string; party?: string }>;
}): GrantUserRightsResponse {
    const rights: UserRightAssignment[] = (payload.rights ?? []).map(
        (right) => ({
            type: right.type as UserRightKind,
            party: right.party,
        }),
    );

    return new GrantUserRightsResponse({ rights });
}
