import {
    BearerTokenAuthProvider,
    CantonClientOptions,
    TransportKind,
} from "../../../src/index.js";
import {
    liveEndpointEnvironmentVariableNames,
    getLiveEndpointDefaults,
} from "../fixtures/live-endpoint-defaults.js";
import { createHmac } from "node:crypto";

const defaultRequestTimeoutMs = 5_000;
const grpcConnectTimeoutMs = 3_000;
const sharedRunId = createDefaultRunId();

export interface LiveTestEnvironment {
    readonly runId: string;
    readonly transportKind: TransportKind;
    readonly options: CantonClientOptions;
}

export function createLiveTestEnvironment(init: {
    transportKind: TransportKind;
    runId?: string;
}): LiveTestEnvironment {
    const defaults = getLiveEndpointDefaults(init.transportKind);

    return {
        runId: init.runId ?? sharedRunId,
        transportKind: init.transportKind,
        options: new CantonClientOptions({
            transportKind: init.transportKind,
            ledgerEndpoint:
                process.env[liveEndpointEnvironmentVariableNames.ledger]
                ?? defaults.ledgerEndpoint,
            ledgerAdminEndpoint:
                process.env[liveEndpointEnvironmentVariableNames.ledgerAdmin]
                ?? defaults.ledgerAdminEndpoint,
            participantAdminEndpoint:
                process.env[
                    liveEndpointEnvironmentVariableNames.participantAdmin
                ]
                ?? defaults.participantAdminEndpoint,
            grpcChannelSecurity: defaults.grpcChannelSecurity,
            defaultRequestTimeoutMs,
            grpcConnectTimeoutMs,
            ledgerAuthProvider: createDefaultAuthProvider(
                process.env[
                    liveEndpointEnvironmentVariableNames.ledgerBearerToken
                ],
            ),
            ledgerAdminAuthProvider: createDefaultAuthProvider(
                process.env[
                    liveEndpointEnvironmentVariableNames.ledgerAdminBearerToken
                ],
            ),
            participantAdminAuthProvider: createDefaultAuthProvider(
                process.env[
                    liveEndpointEnvironmentVariableNames
                        .participantAdminBearerToken
                ],
            ),
        }),
    };
}

function createDefaultRunId(): string {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");

    return `live${timestamp}`;
}

function createDefaultAuthProvider(
    explicitToken: string | undefined,
): BearerTokenAuthProvider {
    return new BearerTokenAuthProvider(
        explicitToken ?? createSharedSecretToken(),
    );
}

function createSharedSecretToken(): string {
    const secret =
        process.env[liveEndpointEnvironmentVariableNames.sharedSecret]
        ?? "unsafe";
    const audience =
        process.env[liveEndpointEnvironmentVariableNames.sharedSecretAudience]
        ?? "https://canton.network.global";
    const subject =
        process.env[liveEndpointEnvironmentVariableNames.sharedSecretSubject]
        ?? "ledger-api-user";
    const header = encodeBase64Url({
        alg: "HS256",
        typ: "JWT",
    });
    const payload = encodeBase64Url({
        aud: audience,
        sub: subject,
    });
    const signature = createHmac("sha256", secret)
        .update(`${header}.${payload}`)
        .digest("base64url");

    return `${header}.${payload}.${signature}`;
}

function encodeBase64Url(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString("base64url");
}
