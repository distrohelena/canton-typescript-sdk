import { createHmac } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { credentials } from "@grpc/grpc-js";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import { SynchronizerConnectivityServiceClient } from "../dist/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.client.js";
import { ListRegisteredSynchronizersResponse_Status } from "../dist/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.js";
import { SequencerConnectionValidation } from "../dist/transports/grpc/generated/canton/com/digitalasset/canton/admin/sequencer/v30/sequencer_connection.js";
import { VersionServiceClient } from "../dist/transports/grpc/generated/canton/com/daml/ledger/api/v2/version_service.client.js";

function getRequiredEnvironment(name) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} must be set.`);
    return value;
}

function createSharedSecretToken() {
    const secret = process.env.PARTICIPANT_358_SOURCE_SHARED_SECRET ?? "unsafe";
    const audience = process.env.PARTICIPANT_358_SOURCE_AUTH_AUDIENCE
        ?? "https://canton.network.global";
    const subject = process.env.PARTICIPANT_358_SOURCE_AUTH_SUBJECT
        ?? "ledger-api-user";
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ aud: audience, sub: subject })).toString("base64url");
    const signature = createHmac("sha256", secret)
        .update(`${header}.${payload}`)
        .digest("base64url");
    return `${header}.${payload}.${signature}`;
}

function createClient(endpoint, token) {
    const transport = new GrpcTransport({
        host: endpoint.replace(/^https?:\/\//, ""),
        channelCredentials: credentials.createInsecure(),
    });
    const options = token ? { meta: { authorization: `Bearer ${token}` } } : undefined;
    return { client: new SynchronizerConnectivityServiceClient(transport), options, transport };
}

function encode(value) {
    if (value instanceof Uint8Array) return { $bytes: Buffer.from(value).toString("base64") };
    if (Array.isArray(value)) return value.map(encode);
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, encode(nested)]));
    }
    return value;
}

function decode(value) {
    if (Array.isArray(value)) return value.map(decode);
    if (value && typeof value === "object") {
        if (typeof value.$bytes === "string") return Buffer.from(value.$bytes, "base64");
        return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, decode(nested)]));
    }
    return value;
}

async function exportSynchronizerConfig() {
    const targetFile = getRequiredEnvironment("PARTICIPANT_358_SYNCHRONIZER_CONFIG");
    const sourceEndpoint = getRequiredEnvironment("PARTICIPANT_358_SOURCE_ADMIN_ENDPOINT");
    const sourceToken = process.env.PARTICIPANT_358_SOURCE_ADMIN_BEARER_TOKEN ?? createSharedSecretToken();
    const { client, options, transport } = createClient(sourceEndpoint, sourceToken);
    try {
        const response = await client.listRegisteredSynchronizers({ allStatuses: false }, options).response;
        const connected = response.results.filter((result) => result.connected && result.config);
        if (connected.length !== 1) {
            throw new Error(`Expected exactly one connected synchronizer from ${sourceEndpoint}; found ${connected.length}. Set PARTICIPANT_358_SOURCE_ADMIN_ENDPOINT to a participant with one connected synchronizer.`);
        }
        await writeFile(targetFile, `${JSON.stringify(encode(connected[0].config), null, 2)}\n`, { mode: 0o600 });
    } finally {
        transport.close();
    }
}

async function connectSynchronizer() {
    const configFile = getRequiredEnvironment("PARTICIPANT_358_SYNCHRONIZER_CONFIG");
    const targetEndpoint = getRequiredEnvironment("PARTICIPANT_358_ADMIN_ENDPOINT");
    const targetToken = process.env.PARTICIPANT_358_ADMIN_BEARER_TOKEN ?? createSharedSecretToken();
    const config = decode(JSON.parse(await readFile(configFile, "utf8")));
    const { client, options, transport } = createClient(targetEndpoint, targetToken);
    try {
        const connectResponse = await client.connectSynchronizer({
            config,
            sequencerConnectionValidation: SequencerConnectionValidation.ALL,
        }, options).response;
        if (!connectResponse.connectedSuccessfully) {
            throw new Error("ConnectSynchronizer completed without a healthy connection.");
        }
        const registered = await client.listRegisteredSynchronizers({ allStatuses: false }, options).response;
        const isHealthy = registered.results.some(
            (result) => result.connected
                && result.status === ListRegisteredSynchronizersResponse_Status.ACTIVE
                && result.config?.synchronizerAlias === config.synchronizerAlias,
        );
        if (!isHealthy) throw new Error("Synchronizer did not reach active/connected state.");
    } finally {
        transport.close();
    }
}

async function readLedgerApiVersion() {
    const endpoint = getRequiredEnvironment("PARTICIPANT_358_LEDGER_ENDPOINT");
    const token = process.env.PARTICIPANT_358_LEDGER_BEARER_TOKEN ?? createSharedSecretToken();
    const { options, transport } = createClient(endpoint, token);
    try {
        const response = await new VersionServiceClient(transport)
            .getLedgerApiVersion({}, options).response;
        process.stdout.write(`${response.version}\n`);
    } finally {
        transport.close();
    }
}

const command = process.argv[2];
if (command === "export") {
    await exportSynchronizerConfig();
} else if (command === "connect") {
    await connectSynchronizer();
} else if (command === "ledger-api-version") {
    await readLedgerApiVersion();
} else {
    throw new Error("Expected 'export', 'connect', or 'ledger-api-version'.");
}
