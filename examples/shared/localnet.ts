import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import {
    BearerTokenAuthProvider,
    CantonClient,
    CantonClientOptions,
    GrpcChannelSecurity,
    TransportKind,
} from "@distrohelena/canton-typescript-sdk";
import { comDigitalasset } from "@distrohelena/canton-typescript-sdk/protobuf";

const DEFAULT_TLS_ROOT_CERTIFICATE_PATH = ".generated/localnet-tls/ca.crt";

const DEFAULT_EXAMPLE_TIMEOUT_MS = 30_000;

type ExampleClientInit = {
    environment?: NodeJS.ProcessEnv;
    tls?: boolean;
    requireBearerToken?: boolean;
    defaultTlsRootCertificatePath?: string;
};

export function createExampleClientOptions(
    init: ExampleClientInit = {},
): CantonClientOptions {
    const environment = init.environment ?? process.env;
    const tls = init.tls ?? false;
    const security = tls
        ? GrpcChannelSecurity.tls
        : GrpcChannelSecurity.insecure;
    const sharedToken = tokenFromEnvironment(
        environment,
        "SDK_EXAMPLE_BEARER_TOKEN",
    );
    const ledgerToken =
        tokenFromEnvironment(environment, "SDK_EXAMPLE_LEDGER_BEARER_TOKEN") ??
        sharedToken;
    const ledgerAdminToken =
        tokenFromEnvironment(
            environment,
            "SDK_EXAMPLE_LEDGER_ADMIN_BEARER_TOKEN",
        ) ?? sharedToken;
    const participantAdminToken =
        tokenFromEnvironment(
            environment,
            "SDK_EXAMPLE_PARTICIPANT_ADMIN_BEARER_TOKEN",
        ) ?? sharedToken;

    if (
        init.requireBearerToken &&
        !ledgerToken &&
        !ledgerAdminToken &&
        !participantAdminToken
    ) {
        throw new Error(
            "A bearer token is required. Set SDK_EXAMPLE_BEARER_TOKEN or a per-surface SDK_EXAMPLE_*_BEARER_TOKEN.",
        );
    }

    return new CantonClientOptions({
        transportKind: TransportKind.grpc,
        ledgerEndpoint:
            environment.SDK_EXAMPLE_LEDGER_ENDPOINT ?? "localhost:3901",
        ledgerAdminEndpoint:
            environment.SDK_EXAMPLE_LEDGER_ADMIN_ENDPOINT ?? "localhost:3901",
        participantAdminEndpoint:
            environment.SDK_EXAMPLE_PARTICIPANT_ADMIN_ENDPOINT ??
            "localhost:3902",
        grpcChannelSecurity: security,
        ledgerGrpcChannelSecurity: security,
        ledgerAdminGrpcChannelSecurity: security,
        participantAdminGrpcChannelSecurity: security,
        grpcTlsRootCertificates: tls
            ? readTlsRootCertificate(
                  environment.SDK_EXAMPLE_TLS_ROOT_CERTIFICATE ??
                      init.defaultTlsRootCertificatePath ??
                      DEFAULT_TLS_ROOT_CERTIFICATE_PATH,
              )
            : undefined,
        ledgerAuthProvider: createBearerTokenAuthProvider(ledgerToken),
        ledgerAdminAuthProvider:
            createBearerTokenAuthProvider(ledgerAdminToken),
        participantAdminAuthProvider:
            createBearerTokenAuthProvider(participantAdminToken),
    });
}

export function createExampleClient(init?: ExampleClientInit): CantonClient {
    return new CantonClient(createExampleClientOptions(init));
}

export function exampleTimeoutMs(
    environment: NodeJS.ProcessEnv = process.env,
): number {
    const rawTimeout = environment.SDK_EXAMPLE_TIMEOUT_MS;

    if (rawTimeout === undefined) {
        return DEFAULT_EXAMPLE_TIMEOUT_MS;
    }

    const timeout = Number(rawTimeout);

    if (!Number.isSafeInteger(timeout) || timeout <= 0) {
        throw new Error(
            "SDK_EXAMPLE_TIMEOUT_MS must be a positive integer.",
        );
    }

    return timeout;
}

export function createPartyHint(init: { prefix?: string } = {}): string {
    const prefix = (init.prefix ?? process.env.SDK_EXAMPLE_PARTY_PREFIX ?? "example").trim();

    if (!prefix) {
        throw new Error("Party hint prefix must not be empty.");
    }

    return `${prefix}-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

export async function discoverSynchronizerIdAsync(
    client: Pick<CantonClient, "synchronizerConnectivityService">,
    synchronizerOverride?: string,
): Promise<string> {
    if (synchronizerOverride) {
        return synchronizerOverride;
    }

    const response =
        await client.synchronizerConnectivityService.listConnectedSynchronizersAsync(
            comDigitalasset.canton.admin.participant.v30.ListConnectedSynchronizersRequest.create(),
        );
    const healthySynchronizers = response.connectedSynchronizers.filter(
        (synchronizer) => synchronizer.healthy,
    );

    if (healthySynchronizers.length !== 1) {
        throw new Error(
            "Expected exactly one healthy synchronizer. Set SDK_EXAMPLE_SYNCHRONIZER to choose one explicitly.",
        );
    }

    return healthySynchronizers[0].synchronizerId;
}

function tokenFromEnvironment(
    environment: NodeJS.ProcessEnv,
    name: string,
): string | undefined {
    const token = environment[name];
    return token?.trim() ? token : undefined;
}

function createBearerTokenAuthProvider(
    token: string | undefined,
): BearerTokenAuthProvider | undefined {
    return token ? new BearerTokenAuthProvider(token) : undefined;
}

function readTlsRootCertificate(path: string): Uint8Array {
    try {
        return readFileSync(path);
    } catch {
        throw new Error(
            `Unable to read the TLS root certificate at ${path}. Start localnet with LOCALNET_TLS=1 or set SDK_EXAMPLE_TLS_ROOT_CERTIFICATE.`,
        );
    }
}
