import { describe, expect, it, vi } from "vitest";
import {
    ParticipantPartyManagementServiceClient,
    RequestOptions,
} from "../../../src";
import {
    AddPartyAsyncRequest,
    AddPartyAsyncResponse,
    ClearPartyOnboardingFlagRequest,
    ClearPartyOnboardingFlagResponse,
    GetHighestOffsetByTimestampRequest,
    GetHighestOffsetByTimestampResponse,
    ParticipantPermission as GeneratedParticipantPermission,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.js";

describe("ParticipantPartyManagementServiceClient", () => {
    it("forwards participant party management requests through the selected transport", async () => {
        const addPartyResponse = AddPartyAsyncResponse.create({
            addPartyRequestId: "request-1",
        });

        const addPartyAsync = vi.fn(async () => addPartyResponse);

        const clearPartyOnboardingFlagResponse =
            ClearPartyOnboardingFlagResponse.create({
                onboarded: false,
                earliestRetryTimestamp: { seconds: "1767225900", nanos: 0 },
            });

        const clearPartyOnboardingFlagAsync = vi.fn(
            async () => clearPartyOnboardingFlagResponse,
        );

        const highestOffsetResponse = GetHighestOffsetByTimestampResponse.create({
            ledgerOffset: "42",
        });

        const getHighestOffsetByTimestampAsync = vi.fn(async () => highestOffsetResponse);

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

        const addPartyRequest = AddPartyAsyncRequest.create({
            arguments: {
                partyId: "Alice",
                synchronizerId: "sync-1",
                sourceParticipantUid: "participant::source",
                topologySerial: 1,
                participantPermission: GeneratedParticipantPermission.CONFIRMATION,
            },
        });

        const clearOnboardingRequest = ClearPartyOnboardingFlagRequest.create({
            partyId: "Alice",
            synchronizerId: "sync-1",
            beginOffsetExclusive: "42",
        });

        await expect(
            client.addPartyAsync(
                addPartyRequest,
                options,
            ),
        ).resolves.toEqual(addPartyResponse);
        await expect(
            client.clearPartyOnboardingFlagAsync(
                clearOnboardingRequest,
                options,
            ),
        ).resolves.toEqual(clearPartyOnboardingFlagResponse);
        await expect(
            client.getHighestOffsetByTimestampAsync(
                request,
                options,
            ),
        ).resolves.toEqual(highestOffsetResponse);

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
