import { GrantUserRightsResponse, Right } from "../../grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.js";

export function mapJsonGrantRights(payload: {
    result?: Array<{ type: string; party?: string }>;
}): GrantUserRightsResponse {
    return GrantUserRightsResponse.create({
        newlyGrantedRights: (payload.result ?? []).map(mapJsonRight),
    });
}

export function mapJsonRight(right: { type: string; party?: string }): Right {
    switch (right.type) {
        case "participantAdmin": return { kind: { oneofKind: "participantAdmin", participantAdmin: {} } };
        case "canActAs": return { kind: { oneofKind: "canActAs", canActAs: { party: right.party ?? "" } } };
        case "canReadAs": return { kind: { oneofKind: "canReadAs", canReadAs: { party: right.party ?? "" } } };
        case "identityProviderAdmin": return { kind: { oneofKind: "identityProviderAdmin", identityProviderAdmin: {} } };
        case "canActAsAnyParty": return { kind: { oneofKind: "canActAsAnyParty", canActAsAnyParty: {} } };
        case "canReadAsAnyParty": return { kind: { oneofKind: "canReadAsAnyParty", canReadAsAnyParty: {} } };
        case "canExecuteAs": return { kind: { oneofKind: "canExecuteAs", canExecuteAs: { party: right.party ?? "" } } };
        case "canExecuteAsAnyParty": return { kind: { oneofKind: "canExecuteAsAnyParty", canExecuteAsAnyParty: {} } };
        default: throw new Error(`unsupported JSON user right '${right.type}'`);
    }
}
