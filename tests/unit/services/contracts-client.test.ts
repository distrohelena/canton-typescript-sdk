import { describe, expect, it, vi } from "vitest";
import {
    GetActiveContractsRequest,
} from "../../../src";
import {
    GetActiveContractsPageRequest,
    GetActiveContractsPageResponse,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import { StateServiceClient } from "../../../src/services/state/state-service-client.js";

describe("StateServiceClient", () => {
    it("reads active contract pages through the selected transport", async () => {
        const request = GetActiveContractsPageRequest.create({
            activeAtOffset: "42",
            eventFormat: {
                filtersByParty: {
                    Alice: { cumulative: [] },
                },
                verbose: true,
            },
            maxPageSize: 25,
            pageToken: new Uint8Array([1, 2, 3]),
        });

        let capturedRequest: unknown;

        const response = GetActiveContractsPageResponse.create({
            activeContracts: [],
            activeAtOffset: "42",
            nextPageToken: new Uint8Array([9, 8, 7]),
        });

        const transport = {
            features: { supportsCommandSigning: false },
            getLedgerApiVersionAsync: async () => {
                throw new Error("not used");
            },
            allocatePartyAsync: async () => {
                throw new Error("not used");
            },
            listKnownPartiesAsync: async () => {
                throw new Error("not used");
            },
            grantUserRightsAsync: async () => {
                throw new Error("not used");
            },
            uploadDarFileAsync: async () => {
                throw new Error("not used");
            },
            getActiveContractsPageAsync: async (forwardedRequest: unknown) => {
                capturedRequest = forwardedRequest;

                return response;
            },
            getActiveContractsAsync: async () => {
                throw new Error("not used");
            },
            getUpdatesAsync: async () => {
                throw new Error("not used");
            },
            submitCommandAsync: async () => {
                throw new Error("not used");
            },
        };

        const client = new StateServiceClient(transport);

        expect(request.activeAtOffset).toBe("42");
        expect(request.eventFormat?.filtersByParty).toHaveProperty("Alice");
        expect(request.maxPageSize).toBe(25);
        expect(request.pageToken).toEqual(new Uint8Array([1, 2, 3]));

        const result = await client.getActiveContractsPageAsync(request);

        expect(capturedRequest).toBe(request);
        expect(result).toBe(response);
        expect(result.activeAtOffset).toBe("42");
        expect(result.nextPageToken).toEqual(new Uint8Array([9, 8, 7]));
    });

    it("reads active contracts through the selected transport", async () => {
        const request = new GetActiveContractsRequest({
            party: "Alice",
            templateId: "Main:Iou",
        });

        const nextAsync = vi.fn(async () => undefined);

        const transport = {
            features: { supportsCommandSigning: false },
            getLedgerApiVersionAsync: async () => {
                throw new Error("not used");
            },
            allocatePartyAsync: async () => {
                throw new Error("not used");
            },
            listKnownPartiesAsync: async () => {
                throw new Error("not used");
            },
            grantUserRightsAsync: async () => {
                throw new Error("not used");
            },
            uploadDarFileAsync: async () => {
                throw new Error("not used");
            },
            getActiveContractsPageAsync: async () => {
                throw new Error("not used");
            },
            getActiveContractsAsync: async (
                _request: GetActiveContractsRequest,
                observer: { nextAsync(event: unknown): Promise<void> },
            ) => {
                await observer.nextAsync({ contractId: "c1" });
            },
            getUpdatesAsync: async () => {
                throw new Error("not used");
            },
            submitCommandAsync: async () => {
                throw new Error("not used");
            },
        };

        const client = new StateServiceClient(transport);

        expect(request.party).toBe("Alice");
        expect(request.templateId).toBe("Main:Iou");
        await client.getActiveContractsAsync(request, { nextAsync });
        expect(nextAsync).toHaveBeenCalledWith({ contractId: "c1" });
    });
});
