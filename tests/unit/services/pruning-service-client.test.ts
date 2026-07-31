import { describe, expect, it, vi } from "vitest";
import {
    PruningServiceClient,
    RequestOptions,
} from "../../../src";
import {
    GetNoWaitCommitmentsFromRequest,
    GetNoWaitCommitmentsFromResponse,
    GetParticipantScheduleRequest,
    GetParticipantScheduleResponse,
    GetScheduleRequest,
    GetScheduleResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/pruning/v30/pruning.js";
import {
    GetSafePruningOffsetRequest,
    GetSafePruningOffsetResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.js";

describe("PruningServiceClient", () => {
    it("forwards pruning read requests through the selected transport", async () => {
        const safePruningOffsetResponse = GetSafePruningOffsetResponse.create({
            response: { oneofKind: "safePruningOffset", safePruningOffset: "42" },
        });

        const getSafePruningOffsetAsync = vi.fn(async () => safePruningOffsetResponse);

        const scheduleResponse = GetScheduleResponse.create();

        const getPruningScheduleAsync = vi.fn(async () => scheduleResponse);

        const participantScheduleResponse = GetParticipantScheduleResponse.create();

        const getParticipantPruningScheduleAsync = vi.fn(
            async () => participantScheduleResponse,
        );

        const noWaitCommitmentsResponse = GetNoWaitCommitmentsFromResponse.create({
            ignoredParticipants: [],
            notIgnoredParticipants: [],
        });

        const getNoWaitCommitmentsFromAsync = vi.fn(
            async () => noWaitCommitmentsResponse,
        );

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            getSafePruningOffsetAsync,
            getPruningScheduleAsync,
            getParticipantPruningScheduleAsync,
            getNoWaitCommitmentsFromAsync,
        };

        const client = new PruningServiceClient(transport as never);

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        const safePruningOffsetRequest = GetSafePruningOffsetRequest.create({
            beforeOrAt: { seconds: "1767225600", nanos: 0 },
            ledgerEnd: "100",
        });

        const scheduleRequest = GetScheduleRequest.create();

        const participantScheduleRequest = GetParticipantScheduleRequest.create();

        const noWaitCommitmentsRequest = GetNoWaitCommitmentsFromRequest.create({
            synchronizerIds: ["sync-1"],
            participantUids: ["participant-1"],
        });

        await client.getSafePruningOffsetAsync(
            safePruningOffsetRequest,
            options,
        );

        await client.getScheduleAsync(
            scheduleRequest,
            options,
        );

        await client.getParticipantScheduleAsync(
            participantScheduleRequest,
            options,
        );

        await client.getNoWaitCommitmentsFromAsync(
            noWaitCommitmentsRequest,
            options,
        );

        expect(getSafePruningOffsetAsync).toHaveBeenCalledWith(
            safePruningOffsetRequest,
            options,
        );
        expect(getPruningScheduleAsync).toHaveBeenCalledWith(
            scheduleRequest,
            options,
        );
        expect(getParticipantPruningScheduleAsync).toHaveBeenCalledWith(
            participantScheduleRequest,
            options,
        );
        expect(getNoWaitCommitmentsFromAsync).toHaveBeenCalledWith(
            noWaitCommitmentsRequest,
            options,
        );
    });
});
