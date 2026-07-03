import {
    GrantUserRightsRequest,
    UserRightAssignment,
} from "../../../core/types/requests/grant-user-rights-request.js";
import { GrantUserRightsResponse } from "../../../core/types/responses/grant-user-rights-response.js";
import { UserRightKind } from "../../../core/types/user-right-kind.js";
import {
    GrantUserRightsResponse as ProtobufGrantUserRightsResponse,
    Right,
} from "../generated/canton/com/daml/ledger/api/v2/admin/user_management_service.js";

export function mapGrpcGrantUserRightsRequest(
    request: GrantUserRightsRequest,
): {
    userId: string;
    rights: Right[];
    identityProviderId: string;
} {
    return {
        userId: request.userId,
        identityProviderId: "",
        rights: request.rights.map(mapUserRightAssignmentToGrpc),
    };
}

export function mapGrpcGrantUserRights(payload: {
    rights?: Array<{ type: string; party?: string }>;
    newlyGrantedRights?: Right[];
} | ProtobufGrantUserRightsResponse): GrantUserRightsResponse {
    const rights: UserRightAssignment[] = "newlyGrantedRights" in payload
        ? (payload.newlyGrantedRights ?? []).map(mapGrpcRightToAssignment)
        : (payload.rights ?? []).map((right) => ({
            type: right.type as UserRightKind,
            party: right.party,
        }));

    return new GrantUserRightsResponse({ rights });
}

function mapUserRightAssignmentToGrpc(right: UserRightAssignment): Right {
    switch (right.type) {
        case UserRightKind.participantAdmin:
            return {
                kind: {
                    oneofKind: "participantAdmin",
                    participantAdmin: {},
                },
            };
        case UserRightKind.canActAs:
            return {
                kind: {
                    oneofKind: "canActAs",
                    canActAs: {
                        party: right.party ?? "",
                    },
                },
            };
        case UserRightKind.canReadAs:
            return {
                kind: {
                    oneofKind: "canReadAs",
                    canReadAs: {
                        party: right.party ?? "",
                    },
                },
            };
    }
}

function mapGrpcRightToAssignment(right: Right): UserRightAssignment {
    switch (right.kind.oneofKind) {
        case "participantAdmin":
            return {
                type: UserRightKind.participantAdmin,
            };
        case "canActAs":
            return {
                type: UserRightKind.canActAs,
                party: right.kind.canActAs.party,
            };
        case "canReadAs":
            return {
                type: UserRightKind.canReadAs,
                party: right.kind.canReadAs.party,
            };
        default:
            throw new Error(
                `Unsupported user right kind: ${String(right.kind.oneofKind)}`,
            );
    }
}
