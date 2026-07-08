import {
    BearerTokenAuthProvider,
    CantonClientOptions,
    TransportKind,
} from "../../../src/index.js";
import {
    liveEndpointEnvironmentVariableNames,
    getLiveEndpointDefaults,
} from "../fixtures/live-endpoint-defaults.js";
import { createHmac, randomBytes } from "node:crypto";

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
    return {
        runId: init.runId ?? sharedRunId,
        transportKind: init.transportKind,
        options: createLiveNodeClientOptions({
            transportKind: init.transportKind,
            nodeIndex: 0,
        }),
    };
}

export function createLiveNodeTestEnvironment(init: {
    transportKind: TransportKind;
    nodeIndex: number;
    runId?: string;
}): LiveTestEnvironment {
    return {
        runId: init.runId ?? sharedRunId,
        transportKind: init.transportKind,
        options: createLiveNodeClientOptions({
            transportKind: init.transportKind,
            nodeIndex: init.nodeIndex,
        }),
    };
}

export function createLiveNodeClientOptions(init: {
    transportKind: TransportKind;
    nodeIndex: number;
}): CantonClientOptions {
    const defaults = getLiveEndpointDefaults(init.transportKind, init.nodeIndex);

    return new CantonClientOptions({
        transportKind: init.transportKind,
        ledgerEndpoint:
            process.env[getLedgerEndpointVariableName(init.nodeIndex)]
            ?? defaults.ledgerEndpoint,
        ledgerAdminEndpoint:
            process.env[getLedgerAdminEndpointVariableName(init.nodeIndex)]
            ?? defaults.ledgerAdminEndpoint,
        participantAdminEndpoint:
            process.env[getParticipantAdminEndpointVariableName(init.nodeIndex)]
            ?? defaults.participantAdminEndpoint,
        grpcChannelSecurity: defaults.grpcChannelSecurity,
        defaultRequestTimeoutMs,
        grpcConnectTimeoutMs,
        ledgerAuthProvider: createDefaultAuthProvider(
            process.env[liveEndpointEnvironmentVariableNames.ledgerBearerToken],
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
    });
}

function createDefaultRunId(): string {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");

    const entropy = randomBytes(4).toString("hex");

    return `live${timestamp}${entropy}`;
}

function getLedgerEndpointVariableName(nodeIndex: number): string {
    switch (nodeIndex) {
        case 1:
            return liveEndpointEnvironmentVariableNames.secondaryLedger;
        case 2:
            return liveEndpointEnvironmentVariableNames.tertiaryLedger;
        default:
            return liveEndpointEnvironmentVariableNames.ledger;
    }
}

function getLedgerAdminEndpointVariableName(nodeIndex: number): string {
    switch (nodeIndex) {
        case 1:
            return liveEndpointEnvironmentVariableNames.secondaryLedgerAdmin;
        case 2:
            return liveEndpointEnvironmentVariableNames.tertiaryLedgerAdmin;
        default:
            return liveEndpointEnvironmentVariableNames.ledgerAdmin;
    }
}

function getParticipantAdminEndpointVariableName(nodeIndex: number): string {
    switch (nodeIndex) {
        case 1:
            return liveEndpointEnvironmentVariableNames.secondaryParticipantAdmin;
        case 2:
            return liveEndpointEnvironmentVariableNames.tertiaryParticipantAdmin;
        default:
            return liveEndpointEnvironmentVariableNames.participantAdmin;
    }
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
