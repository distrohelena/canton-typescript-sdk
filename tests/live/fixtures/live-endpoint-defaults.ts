import { readFileSync } from "node:fs";
import { GrpcChannelSecurity, TransportKind } from "../../../src/index.js";

export const liveEndpointEnvironmentVariableNames = {
    ledger: "SDK_TEST_LEDGER_ENDPOINT",
    ledgerAdmin: "SDK_TEST_LEDGER_ADMIN_ENDPOINT",
    participantAdmin: "SDK_TEST_PARTICIPANT_ADMIN_ENDPOINT",
    secondaryLedger: "SDK_TEST_SECONDARY_LEDGER_ENDPOINT",
    secondaryLedgerAdmin: "SDK_TEST_SECONDARY_LEDGER_ADMIN_ENDPOINT",
    secondaryParticipantAdmin: "SDK_TEST_SECONDARY_PARTICIPANT_ADMIN_ENDPOINT",
    tertiaryLedger: "SDK_TEST_TERTIARY_LEDGER_ENDPOINT",
    tertiaryLedgerAdmin: "SDK_TEST_TERTIARY_LEDGER_ADMIN_ENDPOINT",
    tertiaryParticipantAdmin: "SDK_TEST_TERTIARY_PARTICIPANT_ADMIN_ENDPOINT",
    quaternaryLedger: "SDK_TEST_QUATERNARY_LEDGER_ENDPOINT",
    quaternaryLedgerAdmin: "SDK_TEST_QUATERNARY_LEDGER_ADMIN_ENDPOINT",
    quaternaryParticipantAdmin:
        "SDK_TEST_QUATERNARY_PARTICIPANT_ADMIN_ENDPOINT",
    quinaryLedger: "SDK_TEST_QUINARY_LEDGER_ENDPOINT",
    quinaryLedgerAdmin: "SDK_TEST_QUINARY_LEDGER_ADMIN_ENDPOINT",
    quinaryParticipantAdmin: "SDK_TEST_QUINARY_PARTICIPANT_ADMIN_ENDPOINT",
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
    nodeIndex = 0,
): LiveEndpointDefaults {
    if (transportKind === TransportKind.grpc) {
        if (nodeIndex === 1) {
            return {
                ledgerEndpoint: "http://localhost:4901",
                ledgerAdminEndpoint: "http://localhost:4901",
                participantAdminEndpoint: "http://localhost:4902",
                grpcChannelSecurity: GrpcChannelSecurity.insecure,
            };
        }

        if (nodeIndex === 2) {
            return {
                ledgerEndpoint: "http://localhost:5901",
                ledgerAdminEndpoint: "http://localhost:5901",
                participantAdminEndpoint: "http://localhost:5902",
                grpcChannelSecurity: GrpcChannelSecurity.insecure,
            };
        }

        if (nodeIndex === 3) {
            return {
                ledgerEndpoint: "http://localhost:6901",
                ledgerAdminEndpoint: "http://localhost:6901",
                participantAdminEndpoint: "http://localhost:6902",
                grpcChannelSecurity: GrpcChannelSecurity.insecure,
            };
        }

        if (nodeIndex === 4) {
            return {
                ledgerEndpoint: "http://localhost:7901",
                ledgerAdminEndpoint: "http://localhost:7901",
                participantAdminEndpoint: "http://localhost:7902",
                grpcChannelSecurity: GrpcChannelSecurity.insecure,
            };
        }

        return {
            ledgerEndpoint: "http://localhost:3901",
            ledgerAdminEndpoint: "http://localhost:3901",
            participantAdminEndpoint: "http://localhost:3902",
            grpcChannelSecurity: GrpcChannelSecurity.insecure,
        };
    }

    if (nodeIndex === 1) {
        return {
            ledgerEndpoint: "http://localhost:4975",
            ledgerAdminEndpoint: "http://localhost:4975",
            participantAdminEndpoint: undefined,
            grpcChannelSecurity: GrpcChannelSecurity.insecure,
        };
    }

    if (nodeIndex === 2) {
        return {
            ledgerEndpoint: "http://localhost:5975",
            ledgerAdminEndpoint: "http://localhost:5975",
            participantAdminEndpoint: undefined,
            grpcChannelSecurity: GrpcChannelSecurity.insecure,
        };
    }

    if (nodeIndex === 3) {
        return {
            ledgerEndpoint: "http://localhost:6975",
            ledgerAdminEndpoint: "http://localhost:6975",
            participantAdminEndpoint: undefined,
            grpcChannelSecurity: GrpcChannelSecurity.insecure,
        };
    }

    if (nodeIndex === 4) {
        return {
            ledgerEndpoint: "http://localhost:7975",
            ledgerAdminEndpoint: "http://localhost:7975",
            participantAdminEndpoint: undefined,
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

/** Channel security for live gRPC tests: SDK_TEST_GRPC_CHANNEL_SECURITY overrides the per-node default. */
export function resolveLiveGrpcChannelSecurity(fallback: GrpcChannelSecurity): GrpcChannelSecurity {
    const value = (process.env.SDK_TEST_GRPC_CHANNEL_SECURITY ?? "").trim().toLowerCase();

    if (value === "tls") {
        return GrpcChannelSecurity.tls;
    } else if (value === "insecure") {
        return GrpcChannelSecurity.insecure;
    } else if (value.length > 0) {
        throw new Error("SDK_TEST_GRPC_CHANNEL_SECURITY must be 'tls' or 'insecure'.");
    }

    return fallback;
}

/** Root CA for TLS live runs, from SDK_TEST_GRPC_TLS_ROOT_CERT_PATH (e.g. the localnet's generated ca.crt). */
export function resolveLiveTlsRootCertificates(): Uint8Array | undefined {
    const path = (process.env.SDK_TEST_GRPC_TLS_ROOT_CERT_PATH ?? "").trim();

    if (path.length === 0) {
        return undefined;
    }

    return new Uint8Array(readFileSync(path));
}
