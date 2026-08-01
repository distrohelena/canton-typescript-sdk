import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
    GrpcChannelSecurity,
    TransportKind,
} from "@distrohelena/canton-typescript-sdk";
import { comDigitalasset } from "@distrohelena/canton-typescript-sdk/protobuf";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    createExampleClientOptions,
    createPartyHint,
    discoverSynchronizerIdAsync,
    exampleTimeoutMs,
} from "../../../examples/shared/localnet.js";

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
    const directory = mkdtempSync(join(tmpdir(), "canton-example-localnet-"));
    temporaryDirectories.push(directory);
    return directory;
}

function environment(
    values: Record<string, string | undefined> = {},
): NodeJS.ProcessEnv {
    return values;
}

function healthySynchronizer(synchronizerId: string) {
    return {
        synchronizerAlias: "local",
        synchronizerId,
        physicalSynchronizerId: "physical",
        healthy: true,
    };
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    for (const directory of temporaryDirectories.splice(0)) {
        rmSync(directory, { recursive: true, force: true });
    }
});

describe("localnet example helpers", () => {
    it("uses the default example timeout when no override is configured", () => {
        expect(exampleTimeoutMs(environment())).toBe(30_000);
    });

    it("uses a positive integer timeout override", () => {
        expect(
            exampleTimeoutMs(
                environment({ SDK_EXAMPLE_TIMEOUT_MS: "45000" }),
            ),
        ).toBe(45_000);
    });

    it("rejects invalid example timeout overrides", () => {
        for (const timeout of ["", "0", "-1", "abc", "1.5"]) {
            expect(() =>
                exampleTimeoutMs(
                    environment({ SDK_EXAMPLE_TIMEOUT_MS: timeout }),
                ),
            ).toThrow(/SDK_EXAMPLE_TIMEOUT_MS/);
        }
    });

    it("creates insecure gRPC options for ordinary localnet examples", () => {
        const options = createExampleClientOptions({ environment: environment() });

        expect(options).toMatchObject({
            transportKind: TransportKind.grpc,
            ledgerEndpoint: "localhost:3901",
            ledgerAdminEndpoint: "localhost:3901",
            participantAdminEndpoint: "localhost:3902",
            grpcChannelSecurity: GrpcChannelSecurity.insecure,
        });
    });

    it("honors each localnet endpoint override independently", () => {
        const options = createExampleClientOptions({
            environment: environment({
                SDK_EXAMPLE_LEDGER_ENDPOINT: "ledger.example:1",
                SDK_EXAMPLE_LEDGER_ADMIN_ENDPOINT: "ledger-admin.example:2",
                SDK_EXAMPLE_PARTICIPANT_ADMIN_ENDPOINT: "participant-admin.example:3",
            }),
        });

        expect(options.ledgerEndpoint).toBe("ledger.example:1");
        expect(options.ledgerAdminEndpoint).toBe("ledger-admin.example:2");
        expect(options.participantAdminEndpoint).toBe("participant-admin.example:3");
    });

    it("uses a configured CA for every gRPC surface when TLS is requested", () => {
        const certificatePath = join(temporaryDirectory(), "ca.crt");
        writeFileSync(certificatePath, "test CA");

        const options = createExampleClientOptions({
            tls: true,
            environment: environment({
                SDK_EXAMPLE_TLS_ROOT_CERTIFICATE: certificatePath,
            }),
        });

        expect(options).toMatchObject({
            grpcChannelSecurity: GrpcChannelSecurity.tls,
            ledgerGrpcChannelSecurity: GrpcChannelSecurity.tls,
            ledgerAdminGrpcChannelSecurity: GrpcChannelSecurity.tls,
            participantAdminGrpcChannelSecurity: GrpcChannelSecurity.tls,
        });
        expect(options.grpcTlsRootCertificates).toEqual(readFileSync(certificatePath));
    });

    it("uses the injected default CA path when TLS is requested without an explicit CA", () => {
        const certificatePath = join(temporaryDirectory(), "default-ca.crt");
        writeFileSync(certificatePath, "default test CA");

        const options = createExampleClientOptions({
            tls: true,
            defaultTlsRootCertificatePath: certificatePath,
            environment: environment(),
        });

        expect(options.grpcTlsRootCertificates).toEqual(readFileSync(certificatePath));
    });

    it("prefers the configured TLS CA over the injected default path", () => {
        const directory = temporaryDirectory();
        const configuredCertificatePath = join(directory, "configured-ca.crt");
        const defaultCertificatePath = join(directory, "default-ca.crt");
        writeFileSync(configuredCertificatePath, "configured test CA");
        writeFileSync(defaultCertificatePath, "default test CA");

        const options = createExampleClientOptions({
            tls: true,
            defaultTlsRootCertificatePath: defaultCertificatePath,
            environment: environment({
                SDK_EXAMPLE_TLS_ROOT_CERTIFICATE: configuredCertificatePath,
            }),
        });

        expect(options.grpcTlsRootCertificates).toEqual(
            readFileSync(configuredCertificatePath),
        );
    });

    it("explains how to configure TLS when its CA cannot be read", () => {
        const certificatePath = join(temporaryDirectory(), "missing-ca.crt");

        expect(() =>
            createExampleClientOptions({
                tls: true,
                defaultTlsRootCertificatePath: certificatePath,
                environment: environment(),
            }),
        ).toThrow(new RegExp(`${certificatePath}.*LOCALNET_TLS=1.*SDK_EXAMPLE_TLS_ROOT_CERTIFICATE`));
    });

    it("requires a bearer token without leaking token values", () => {
        const secret = "never-print-this-token";

        expect(() =>
            createExampleClientOptions({
                requireBearerToken: true,
                environment: environment(),
            }),
        ).toThrow(/SDK_EXAMPLE_BEARER_TOKEN/);
        expect(() =>
            createExampleClientOptions({
                requireBearerToken: true,
                environment: environment(),
            }),
        ).not.toThrow(new RegExp(secret));
    });

    it("uses shared and per-surface bearer tokens through auth providers", async () => {
        const sharedOptions = createExampleClientOptions({
            environment: environment({ SDK_EXAMPLE_BEARER_TOKEN: "shared" }),
        });

        await expect(
            sharedOptions.ledgerAuthProvider?.getHeadersAsync(),
        ).resolves.toEqual({ authorization: "Bearer shared" });
        await expect(
            sharedOptions.ledgerAdminAuthProvider?.getHeadersAsync(),
        ).resolves.toEqual({ authorization: "Bearer shared" });
        await expect(
            sharedOptions.participantAdminAuthProvider?.getHeadersAsync(),
        ).resolves.toEqual({ authorization: "Bearer shared" });

        const options = createExampleClientOptions({
            environment: environment({
                SDK_EXAMPLE_BEARER_TOKEN: "shared",
                SDK_EXAMPLE_LEDGER_BEARER_TOKEN: "ledger",
                SDK_EXAMPLE_LEDGER_ADMIN_BEARER_TOKEN: "ledger-admin",
                SDK_EXAMPLE_PARTICIPANT_ADMIN_BEARER_TOKEN: "participant-admin",
            }),
        });

        await expect(options.ledgerAuthProvider?.getHeadersAsync()).resolves.toEqual({
            authorization: "Bearer ledger",
        });
        await expect(options.ledgerAdminAuthProvider?.getHeadersAsync()).resolves.toEqual({
            authorization: "Bearer ledger-admin",
        });
        await expect(options.participantAdminAuthProvider?.getHeadersAsync()).resolves.toEqual({
            authorization: "Bearer participant-admin",
        });
    });

    it("creates distinct party hints with a validated optional prefix", () => {
        const first = createPartyHint({ prefix: " example " });
        const second = createPartyHint({ prefix: " example " });

        expect(first).toMatch(/^example-[0-9]+-[0-9a-f]{8}$/);
        expect(second).toMatch(/^example-[0-9]+-[0-9a-f]{8}$/);
        expect(second).not.toBe(first);
        expect(() => createPartyHint({ prefix: "   " })).toThrow(/prefix/i);
    });

    it("uses the configured party hint prefix when no explicit prefix is supplied", () => {
        vi.stubEnv("SDK_EXAMPLE_PARTY_PREFIX", "environment-prefix");

        expect(createPartyHint()).toMatch(
            /^environment-prefix-[0-9]+-[0-9a-f]{8}$/,
        );
    });

    it("uses example as the party hint prefix when no prefix is configured", () => {
        vi.stubEnv("SDK_EXAMPLE_PARTY_PREFIX", undefined);

        expect(createPartyHint()).toMatch(/^example-[0-9]+-[0-9a-f]{8}$/);
    });

    it("returns a non-empty synchronizer override without querying the client", async () => {
        const client = {
            synchronizerConnectivityService: {
                listConnectedSynchronizersAsync: vi.fn(),
            },
        };

        await expect(
            discoverSynchronizerIdAsync(client as never, "sync::override"),
        ).resolves.toBe("sync::override");
        expect(
            client.synchronizerConnectivityService.listConnectedSynchronizersAsync,
        ).not.toHaveBeenCalled();
    });

    it("discovers exactly one healthy synchronizer using the public protobuf request", async () => {
        const requestCreate = vi.spyOn(
            comDigitalasset.canton.admin.participant.v30.ListConnectedSynchronizersRequest,
            "create",
        );
        const client = {
            synchronizerConnectivityService: {
                listConnectedSynchronizersAsync: vi.fn().mockResolvedValue({
                    connectedSynchronizers: [healthySynchronizer("sync::healthy")],
                }),
            },
        };

        await expect(discoverSynchronizerIdAsync(client as never)).resolves.toBe(
            "sync::healthy",
        );
        expect(requestCreate).toHaveBeenCalledWith();
        expect(
            client.synchronizerConnectivityService.listConnectedSynchronizersAsync,
        ).toHaveBeenCalledWith(expect.any(Object));
    });

    it("asks for a synchronizer override when discovery finds zero or multiple healthy entries", async () => {
        for (const connectedSynchronizers of [
            [],
            [healthySynchronizer("sync::one"), healthySynchronizer("sync::two")],
        ]) {
            const client = {
                synchronizerConnectivityService: {
                    listConnectedSynchronizersAsync: vi.fn().mockResolvedValue({
                        connectedSynchronizers,
                    }),
                },
            };

            await expect(
                discoverSynchronizerIdAsync(client as never),
            ).rejects.toThrow(/SDK_EXAMPLE_SYNCHRONIZER/);
        }
    });
});
