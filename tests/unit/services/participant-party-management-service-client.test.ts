import { describe, expect, it, vi } from "vitest";
import {
    AddPartyAsyncRequest,
    AddPartyAsyncResponse,
    ClearPartyOnboardingFlagRequest,
    ClearPartyOnboardingFlagResponse,
    ParticipantPermission,
    ParticipantPartyManagementServiceClient,
    RequestOptions,
} from "../../../src";
import {
    GetHighestOffsetByTimestampRequest,
    GetHighestOffsetByTimestampResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.js";

describe("ParticipantPartyManagementServiceClient", () => {
    it("forwards participant party management requests through the selected transport", async () => {
        const addPartyAsync = vi.fn(
            async () =>
                new AddPartyAsyncResponse({
                    addPartyRequestId: "request-1",
                }),
        );

        const clearPartyOnboardingFlagAsync = vi.fn(
            async () =>
                new ClearPartyOnboardingFlagResponse({
                    onboarded: false,
                    earliestRetryTimestamp: new Date(
                        "2026-01-01T00:05:00.000Z",
                    ),
                }),
        );

        const getHighestOffsetByTimestampAsync = vi.fn(
            async () => GetHighestOffsetByTimestampResponse.create({ ledgerOffset: "42" }),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            addPartyAsync,
            clearPartyOnboardingFlagAsync,
            getHighestOffsetByTimestampAsync,
        };

        const client = new ParticipantPartyManagementServiceClient(
            transport as never,
        );

        const request = GetHighestOffsetByTimestampRequest.create({
            synchronizerId: "sync-1",
            timestamp: { seconds: "1767225600", nanos: 0 },
            force: true,
        });

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        const addPartyRequest = new AddPartyAsyncRequest({
            arguments: {
                partyId: "Alice",
                synchronizerId: "sync-1",
                sourceParticipantUid: "participant::source",
                topologySerial: 1,
                participantPermission: ParticipantPermission.confirmation,
            },
        });

        const clearOnboardingRequest = new ClearPartyOnboardingFlagRequest({
            partyId: "Alice",
            synchronizerId: "sync-1",
            beginOffsetExclusive: "42",
        });

        await expect(
            client.addPartyAsync(
                addPartyRequest,
                options,
            ),
        ).resolves.toBeInstanceOf(AddPartyAsyncResponse);
        await expect(
            client.clearPartyOnboardingFlagAsync(
                clearOnboardingRequest,
                options,
            ),
        ).resolves.toBeInstanceOf(ClearPartyOnboardingFlagResponse);
        await expect(
            client.getHighestOffsetByTimestampAsync(
                request,
                options,
            ),
        ).resolves.toBeDefined();

        expect(addPartyAsync).toHaveBeenCalledWith(
            addPartyRequest,
            options,
        );
        expect(clearPartyOnboardingFlagAsync).toHaveBeenCalledWith(
            clearOnboardingRequest,
            options,
        );
        expect(getHighestOffsetByTimestampAsync).toHaveBeenCalledWith(
            request,
            options,
        );
    });
});
