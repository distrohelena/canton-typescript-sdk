import { GrpcChannelSecurity, TransportKind } from "../../../src/index.js";

export const liveEndpointEnvironmentVariableNames = {
    ledger: "SDK_TEST_LEDGER_ENDPOINT",
    ledgerAdmin: "SDK_TEST_LEDGER_ADMIN_ENDPOINT",
    participantAdmin: "SDK_TEST_PARTICIPANT_ADMIN_ENDPOINT",
    ledgerBearerToken: "SDK_TEST_LEDGER_BEARER_TOKEN",
    ledgerAdminBearerToken: "SDK_TEST_LEDGER_ADMIN_BEARER_TOKEN",
    participantAdminBearerToken: "SDK_TEST_PARTICIPANT_ADMIN_BEARER_TOKEN",
    sharedSecret: "SDK_TEST_SHARED_SECRET",
    sharedSecretAudience: "SDK_TEST_SHARED_SECRET_AUDIENCE",
    sharedSecretSubject: "SDK_TEST_SHARED_SECRET_SUBJECT",
} as const;

export interface LiveEndpointDefaults {
    readonly ledgerEndpoint: string;
    readonly ledgerAdminEndpoint: string;
    readonly participantAdminEndpoint?: string;
    readonly grpcChannelSecurity: GrpcChannelSecurity;
}

export function getLiveEndpointDefaults(
    transportKind: TransportKind,
): LiveEndpointDefaults {
    if (transportKind === TransportKind.grpc) {
        return {
            ledgerEndpoint: "http://localhost:3901",
            ledgerAdminEndpoint: "http://localhost:3901",
            participantAdminEndpoint: "http://localhost:3902",
            grpcChannelSecurity: GrpcChannelSecurity.insecure,
        };
    }

    return {
        ledgerEndpoint: "http://localhost:3975",
        ledgerAdminEndpoint: "http://localhost:3975",
        participantAdminEndpoint: undefined,
        grpcChannelSecurity: GrpcChannelSecurity.insecure,
    };
}
