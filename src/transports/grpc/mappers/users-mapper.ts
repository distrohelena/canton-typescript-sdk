import {
    GrantUserRightsRequest,
    UserRightAssignment,
} from "../../../core/types/requests/grant-user-rights-request.js";
import { GetUserRequest } from "../../../core/types/requests/get-user-request.js";
import { ListUserRightsRequest } from "../../../core/types/requests/list-user-rights-request.js";
import { ListUsersRequest } from "../../../core/types/requests/list-users-request.js";
import { GetUserResponse } from "../../../core/types/responses/get-user-response.js";
import { GrantUserRightsResponse } from "../../../core/types/responses/grant-user-rights-response.js";
import { ListUserRightsResponse } from "../../../core/types/responses/list-user-rights-response.js";
import { ListUsersResponse } from "../../../core/types/responses/list-users-response.js";
import { LedgerUser } from "../../../core/types/ledger-user.js";
import { ObjectMeta } from "../../../core/types/object-meta.js";
import { UserRightKind } from "../../../core/types/user-right-kind.js";
import {
    GetUserResponse as ProtobufGetUserResponse,
    ListUserRightsResponse as ProtobufListUserRightsResponse,
    ListUsersResponse as ProtobufListUsersResponse,
    GrantUserRightsResponse as ProtobufGrantUserRightsResponse,
    Right,
    User,
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

export function mapGrpcGetUserRequest(
    request: GetUserRequest,
): {
    userId: string;
    identityProviderId: string;
} {
    return {
        userId: request.userId ?? "",
        identityProviderId: request.identityProviderId ?? "",
    };
}

export function mapGrpcGetUser(
    payload: Partial<ProtobufGetUserResponse>,
): GetUserResponse {
    return new GetUserResponse({
        user:
            payload.user === undefined
                ? undefined
                : mapGrpcUser(payload.user),
    });
}

export function mapGrpcListUsersRequest(
    request: ListUsersRequest,
): {
    pageToken: string;
    pageSize: number;
    identityProviderId: string;
} {
    return {
        pageToken: request.pageToken ?? "",
        pageSize: request.pageSize ?? 0,
        identityProviderId: request.identityProviderId ?? "",
    };
}

export function mapGrpcListUsers(
    payload: Partial<ProtobufListUsersResponse>,
): ListUsersResponse {
    return new ListUsersResponse({
        users: (payload.users ?? []).map(mapGrpcUser),
        nextPageToken: payload.nextPageToken || undefined,
    });
}

export function mapGrpcListUserRightsRequest(
    request: ListUserRightsRequest,
): {
    userId: string;
    identityProviderId: string;
} {
    return {
        userId: request.userId,
        identityProviderId: request.identityProviderId ?? "",
    };
}

export function mapGrpcListUserRights(
    payload: Partial<ProtobufListUserRightsResponse>,
): ListUserRightsResponse {
    return new ListUserRightsResponse({
        rights: (payload.rights ?? []).map(mapGrpcRightToAssignment),
    });
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
        case UserRightKind.identityProviderAdmin:
            return {
                kind: {
                    oneofKind: "identityProviderAdmin",
                    identityProviderAdmin: {},
                },
            };
        case UserRightKind.canReadAsAnyParty:
            return {
                kind: {
                    oneofKind: "canReadAsAnyParty",
                    canReadAsAnyParty: {},
                },
            };
        case UserRightKind.canExecuteAs:
            return {
                kind: {
                    oneofKind: "canExecuteAs",
                    canExecuteAs: {
                        party: right.party ?? "",
                    },
                },
            };
        case UserRightKind.canExecuteAsAnyParty:
            return {
                kind: {
                    oneofKind: "canExecuteAsAnyParty",
                    canExecuteAsAnyParty: {},
                },
            };
        case UserRightKind.canActAsAnyParty:
            return {
                kind: {
                    oneofKind: "canActAsAnyParty",
                    canActAsAnyParty: {},
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
        case "identityProviderAdmin":
            return {
                type: UserRightKind.identityProviderAdmin,
            };
        case "canReadAsAnyParty":
            return {
                type: UserRightKind.canReadAsAnyParty,
            };
        case "canExecuteAs":
            return {
                type: UserRightKind.canExecuteAs,
                party: right.kind.canExecuteAs.party,
            };
        case "canExecuteAsAnyParty":
            return {
                type: UserRightKind.canExecuteAsAnyParty,
            };
        case "canActAsAnyParty":
            return {
                type: UserRightKind.canActAsAnyParty,
            };
        default:
            throw new Error(
                `Unsupported user right kind: ${String(right.kind.oneofKind)}`,
            );
    }
}

function mapGrpcUser(payload: Partial<User>): LedgerUser {
    return new LedgerUser({
        id: payload.id ?? "",
        primaryParty: payload.primaryParty || undefined,
        isDeactivated: payload.isDeactivated ?? false,
        metadata:
            payload.metadata === undefined
                ? undefined
                : new ObjectMeta({
                    resourceVersion: payload.metadata.resourceVersion || undefined,
                    annotations: payload.metadata.annotations,
                }),
        identityProviderId: payload.identityProviderId || undefined,
        primaryPartyAuthentication: payload.primaryPartyAuthentication ?? false,
    });
}
