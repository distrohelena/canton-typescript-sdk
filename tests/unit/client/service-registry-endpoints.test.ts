import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    AllocateExternalPartyRequest,
    AllocateExternalPartyResponse,
    CantonClientOptions,
    EndpointNotConfiguredError,
    ExternalPartyCryptoKeyFormat,
    ExternalPartySigningKeySpec,
    ExternalPartySigningPublicKey,
    GetParticipantStatusRequest,
    GetParticipantStatusResponse,
    ListAvailableStoresRequest,
    ListAvailableStoresResponse,
    GenerateTopologyTransactionsRequest,
    GenerateTopologyTransactionsResponse,
    GenerateExternalPartyTopologyRequest,
    GenerateExternalPartyTopologyResponse,
    UploadDarFileRequest,
    UploadDarFileResponse,
    ListKnownPartiesRequest,
    ListKnownPartiesResponse,
    ParticipantNodeStatus,
    TopologyListPartiesRequest,
    TopologyListPartiesResponse,
    TransportKind,
} from "../../../src";
import { GetLedgerApiVersionResponse } from "../../../src/core/types/responses/get-ledger-api-version-response.js";
import { createServiceRegistry } from "../../../src/client/service-registry.js";
import { createJsonTransport } from "../../../src/transports/json/json-transport-factory.js";

vi.mock("../../../src/transports/json/json-transport-factory.js", () => ({
    createJsonTransport: vi.fn(),
}));

describe("service registry endpoint routing", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("routes ledger, ledger admin, and participant admin services through separate transports", async () => {
        const ledgerTransport = {
            getLedgerApiVersionAsync: vi.fn(async () => {
                return new GetLedgerApiVersionResponse({
                    version: "3.4.0",
                });
            }),
            listKnownPartiesAsync: vi.fn(async () => {
                throw new Error("ledger transport should not serve ledger admin calls");
            }),
            getParticipantStatusAsync: vi.fn(async () => {
                throw new Error("ledger transport should not serve participant admin calls");
            }),
            listAvailableStoresAsync: vi.fn(async () => {
                throw new Error("ledger transport should not serve participant admin calls");
            }),
            topologyListPartiesAsync: vi.fn(async () => {
                throw new Error("ledger transport should not serve participant admin calls");
            }),
            generateTopologyTransactionsAsync: vi.fn(async () => {
                throw new Error("ledger transport should not serve participant admin calls");
            }),
            uploadDarFileAsync: vi.fn(async () => {
                throw new Error("ledger transport should not serve ledger admin calls");
            }),
            generateExternalPartyTopologyAsync: vi.fn(async () => {
                throw new Error("ledger transport should not serve ledger admin calls");
            }),
            allocateExternalPartyAsync: vi.fn(async () => {
                throw new Error("ledger transport should not serve ledger admin calls");
            }),
            disposeAsync: vi.fn(async () => undefined),
            features: {
                supportsCommandSigning: false,
            },
        };

        const ledgerAdminTransport = {
            getLedgerApiVersionAsync: vi.fn(async () => {
                throw new Error("ledger admin transport should not serve ledger calls");
            }),
            listKnownPartiesAsync: vi.fn(async () => {
                return new ListKnownPartiesResponse({
                    partyDetails: [],
                });
            }),
            getParticipantStatusAsync: vi.fn(async () => {
                throw new Error(
                    "ledger admin transport should not serve participant admin calls",
                );
            }),
            listAvailableStoresAsync: vi.fn(async () => {
                throw new Error(
                    "ledger admin transport should not serve participant admin calls",
                );
            }),
            topologyListPartiesAsync: vi.fn(async () => {
                throw new Error(
                    "ledger admin transport should not serve participant admin calls",
                );
            }),
            generateTopologyTransactionsAsync: vi.fn(async () => {
                throw new Error(
                    "ledger admin transport should not serve participant admin calls",
                );
            }),
            uploadDarFileAsync: vi.fn(async () => {
                return new UploadDarFileResponse({
                    packageId: "pkg-1",
                });
            }),
            generateExternalPartyTopologyAsync: vi.fn(async () => {
                return new GenerateExternalPartyTopologyResponse({
                    partyId: "ed25519_party::fingerprint",
                    publicKeyFingerprint: "fingerprint",
                    topologyTransactions: [new Uint8Array([1, 2, 3])],
                    multiHash: new Uint8Array([4, 5, 6]),
                });
            }),
            allocateExternalPartyAsync: vi.fn(async () => {
                return new AllocateExternalPartyResponse({
                    partyId: "ed25519_party::fingerprint",
                });
            }),
            disposeAsync: vi.fn(async () => undefined),
            features: {
                supportsCommandSigning: false,
            },
        };

        const participantAdminTransport = {
            getLedgerApiVersionAsync: vi.fn(async () => {
                throw new Error(
                    "participant admin transport should not serve ledger calls",
                );
            }),
            listKnownPartiesAsync: vi.fn(async () => {
                throw new Error(
                    "participant admin transport should not serve ledger admin calls",
                );
            }),
            getParticipantStatusAsync: vi.fn(async () => {
                return new GetParticipantStatusResponse({
                    status: new ParticipantNodeStatus({
                        uid: "participant::sandbox",
                        active: true,
                        version: "3.4.0",
                        connectedSynchronizers: [],
                        supportedProtocolVersions: [30],
                        components: [],
                        ports: {},
                    }),
                });
            }),
            listAvailableStoresAsync: vi.fn(async () => {
                return new ListAvailableStoresResponse({
                    storeIds: [],
                });
            }),
            topologyListPartiesAsync: vi.fn(async () => {
                return new TopologyListPartiesResponse({
                    results: [],
                });
            }),
            generateTopologyTransactionsAsync: vi.fn(async () => {
                return new GenerateTopologyTransactionsResponse({
                    generatedTransactions: [],
                });
            }),
            uploadDarFileAsync: vi.fn(async () => {
                throw new Error(
                    "participant admin transport should not serve ledger admin calls",
                );
            }),
            disposeAsync: vi.fn(async () => undefined),
            features: {
                supportsCommandSigning: false,
            },
        };

        vi.mocked(createJsonTransport)
            .mockReturnValueOnce(ledgerTransport as never)
            .mockReturnValueOnce(ledgerAdminTransport as never)
            .mockReturnValueOnce(participantAdminTransport as never);

        const services = createServiceRegistry(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                ledgerEndpoint: "https://ledger.example.com",
                ledgerAdminEndpoint: "https://ledger-admin.example.com",
                participantAdminEndpoint: "https://participant-admin.example.com",
            }),
        );

        await expect(
            services.versionService.getLedgerApiVersionAsync(),
        ).resolves.toMatchObject({
            version: "3.4.0",
        });

        await expect(
            services.partyManagementService.listKnownPartiesAsync(
                new ListKnownPartiesRequest(),
            ),
        ).resolves.toBeInstanceOf(ListKnownPartiesResponse);
        await expect(
            services.packageManagementService.uploadDarFileAsync(
                new UploadDarFileRequest({
                    bytes: new Uint8Array([1, 2, 3]),
                }),
            ),
        ).resolves.toBeInstanceOf(UploadDarFileResponse);
        await expect(
            services.partyManagementService.generateExternalPartyTopologyAsync(
                new GenerateExternalPartyTopologyRequest({
                    synchronizer: "sync::sandbox",
                    partyHint: "ed25519_party",
                    publicKey: new ExternalPartySigningPublicKey({
                        format: ExternalPartyCryptoKeyFormat.raw,
                        keyData: new Uint8Array([1, 2, 3]),
                        keySpec: ExternalPartySigningKeySpec.ecCurve25519,
                    }),
                }),
            ),
        ).resolves.toBeInstanceOf(GenerateExternalPartyTopologyResponse);
        await expect(
            services.partyManagementService.allocateExternalPartyAsync(
                new AllocateExternalPartyRequest({
                    synchronizer: "sync::sandbox",
                }),
            ),
        ).resolves.toBeInstanceOf(AllocateExternalPartyResponse);
        await expect(
            services.participantStatusService.getParticipantStatusAsync(
                new GetParticipantStatusRequest(),
            ),
        ).resolves.toBeInstanceOf(GetParticipantStatusResponse);
        await expect(
            services.topologyManagerReadService.listAvailableStoresAsync(
                new ListAvailableStoresRequest(),
            ),
        ).resolves.toBeInstanceOf(ListAvailableStoresResponse);
        await expect(
            services.topologyAggregationService.listPartiesAsync(
                new TopologyListPartiesRequest(),
            ),
        ).resolves.toBeInstanceOf(TopologyListPartiesResponse);
        await expect(
            services.topologyManagerWriteService.generateTransactionsAsync(
                new GenerateTopologyTransactionsRequest(),
            ),
        ).resolves.toBeInstanceOf(GenerateTopologyTransactionsResponse);

        expect(createJsonTransport).toHaveBeenCalledTimes(3);
        expect(ledgerTransport.getLedgerApiVersionAsync).toHaveBeenCalledTimes(1);
        expect(ledgerAdminTransport.listKnownPartiesAsync).toHaveBeenCalledTimes(1);
        expect(ledgerAdminTransport.uploadDarFileAsync).toHaveBeenCalledTimes(1);
        expect(
            ledgerAdminTransport.generateExternalPartyTopologyAsync,
        ).toHaveBeenCalledTimes(1);
        expect(
            ledgerAdminTransport.allocateExternalPartyAsync,
        ).toHaveBeenCalledTimes(1);
        expect(
            participantAdminTransport.getParticipantStatusAsync,
        ).toHaveBeenCalledTimes(1);
        expect(
            participantAdminTransport.listAvailableStoresAsync,
        ).toHaveBeenCalledTimes(1);
        expect(
            participantAdminTransport.topologyListPartiesAsync,
        ).toHaveBeenCalledTimes(1);
        expect(
            participantAdminTransport.generateTopologyTransactionsAsync,
        ).toHaveBeenCalledTimes(1);
    });

    it("fails lazily when the ledger admin and participant admin endpoints are missing", async () => {
        const ledgerTransport = {
            getLedgerApiVersionAsync: vi.fn(async () => {
                return new GetLedgerApiVersionResponse({
                    version: "3.4.0",
                });
            }),
            listKnownPartiesAsync: vi.fn(async () => {
                throw new Error("ledger transport should not serve ledger admin calls");
            }),
            getParticipantStatusAsync: vi.fn(async () => {
                throw new Error("ledger transport should not serve participant admin calls");
            }),
            listAvailableStoresAsync: vi.fn(async () => {
                throw new Error("ledger transport should not serve participant admin calls");
            }),
            topologyListPartiesAsync: vi.fn(async () => {
                throw new Error("ledger transport should not serve participant admin calls");
            }),
            generateTopologyTransactionsAsync: vi.fn(async () => {
                throw new Error("ledger transport should not serve participant admin calls");
            }),
            uploadDarFileAsync: vi.fn(async () => {
                throw new Error("ledger transport should not serve ledger admin calls");
            }),
            generateExternalPartyTopologyAsync: vi.fn(async () => {
                throw new Error("ledger transport should not serve ledger admin calls");
            }),
            allocateExternalPartyAsync: vi.fn(async () => {
                throw new Error("ledger transport should not serve ledger admin calls");
            }),
            disposeAsync: vi.fn(async () => undefined),
            features: {
                supportsCommandSigning: false,
            },
        };

        vi.mocked(createJsonTransport).mockReturnValueOnce(
            ledgerTransport as never,
        );

        const services = createServiceRegistry(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                ledgerEndpoint: "https://ledger.example.com",
            }),
        );

        await expect(
            services.versionService.getLedgerApiVersionAsync(),
        ).resolves.toMatchObject({
            version: "3.4.0",
        });

        await expect(
            services.partyManagementService.listKnownPartiesAsync(
                new ListKnownPartiesRequest(),
            ),
        ).rejects.toThrow(
            "The ledger admin endpoint is not configured for partyManagementService.",
        );

        await expect(
            services.packageManagementService.uploadDarFileAsync(
                new UploadDarFileRequest({
                    bytes: new Uint8Array([1, 2, 3]),
                }),
            ),
        ).rejects.toThrow(
            "The ledger admin endpoint is not configured for packageManagementService.",
        );
        await expect(
            services.partyManagementService.generateExternalPartyTopologyAsync(
                new GenerateExternalPartyTopologyRequest({
                    synchronizer: "sync::sandbox",
                    partyHint: "ed25519_party",
                }),
            ),
        ).rejects.toThrow(
            "The ledger admin endpoint is not configured for partyManagementService.",
        );
        await expect(
            services.partyManagementService.allocateExternalPartyAsync(
                new AllocateExternalPartyRequest({
                    synchronizer: "sync::sandbox",
                }),
            ),
        ).rejects.toThrow(
            "The ledger admin endpoint is not configured for partyManagementService.",
        );

        await expect(
            services.participantStatusService.getParticipantStatusAsync(
                new GetParticipantStatusRequest(),
            ),
        ).rejects.toThrow(
            "The participant admin endpoint is not configured for participantStatusService.",
        );
        await expect(
            services.topologyManagerReadService.listAvailableStoresAsync(
                new ListAvailableStoresRequest(),
            ),
        ).rejects.toThrow(
            "The participant admin endpoint is not configured for topologyManagerReadService.",
        );
        await expect(
            services.topologyAggregationService.listPartiesAsync(
                new TopologyListPartiesRequest(),
            ),
        ).rejects.toThrow(
            "The participant admin endpoint is not configured for topologyAggregationService.",
        );
        await expect(
            services.topologyManagerWriteService.generateTransactionsAsync(
                new GenerateTopologyTransactionsRequest(),
            ),
        ).rejects.toThrow(
            "The participant admin endpoint is not configured for topologyManagerWriteService.",
        );
    });

    it("fails lazily when the ledger endpoint is missing", async () => {
        const services = createServiceRegistry(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                ledgerAdminEndpoint: "https://ledger-admin.example.com",
                participantAdminEndpoint: "https://participant-admin.example.com",
            }),
        );

        await expect(
            services.versionService.getLedgerApiVersionAsync(),
        ).rejects.toThrow(
            "The ledger endpoint is not configured for versionService.",
        );
    });
});
