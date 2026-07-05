import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    CantonClientOptions,
    EndpointNotConfiguredError,
    ListKnownPartiesRequest,
    ListKnownPartiesResponse,
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

    it("routes ledger services and admin services through separate transports", async () => {
        const ledgerTransport = {
            getLedgerApiVersionAsync: vi.fn(async () => {
                return new GetLedgerApiVersionResponse({
                    version: "3.4.0",
                });
            }),
            listKnownPartiesAsync: vi.fn(async () => {
                throw new Error("ledger transport should not serve admin calls");
            }),
            disposeAsync: vi.fn(async () => undefined),
            features: {
                supportsCommandSigning: false,
            },
        };
        const adminTransport = {
            getLedgerApiVersionAsync: vi.fn(async () => {
                throw new Error("admin transport should not serve ledger calls");
            }),
            listKnownPartiesAsync: vi.fn(async () => {
                return new ListKnownPartiesResponse({
                    partyDetails: [],
                });
            }),
            disposeAsync: vi.fn(async () => undefined),
            features: {
                supportsCommandSigning: false,
            },
        };

        vi.mocked(createJsonTransport)
            .mockReturnValueOnce(ledgerTransport as never)
            .mockReturnValueOnce(adminTransport as never);

        const services = createServiceRegistry(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                ledgerEndpoint: "https://ledger.example.com",
                adminEndpoint: "https://admin.example.com",
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

        expect(createJsonTransport).toHaveBeenCalledTimes(2);
        expect(ledgerTransport.getLedgerApiVersionAsync).toHaveBeenCalledTimes(1);
        expect(adminTransport.listKnownPartiesAsync).toHaveBeenCalledTimes(1);
    });

    it("fails lazily when the admin endpoint is missing", async () => {
        const ledgerTransport = {
            getLedgerApiVersionAsync: vi.fn(async () => {
                return new GetLedgerApiVersionResponse({
                    version: "3.4.0",
                });
            }),
            listKnownPartiesAsync: vi.fn(async () => {
                throw new Error("ledger transport should not serve admin calls");
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
        ).rejects.toThrow(EndpointNotConfiguredError);
    });
});
