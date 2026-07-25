import { describe, expect, it, vi } from "vitest";
import {
    GetNoWaitCommitmentsFromRequest,
    GetNoWaitCommitmentsFromResponse,
    GetParticipantPruningScheduleRequest,
    GetParticipantPruningScheduleResponse,
    GetPruningScheduleRequest,
    GetPruningScheduleResponse,
    PruningServiceClient,
    RequestOptions,
} from "../../../src";
import {
    GetSafePruningOffsetRequest,
    GetSafePruningOffsetResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.js";

describe("PruningServiceClient", () => {
    it("forwards pruning read requests through the selected transport", async () => {
        const getSafePruningOffsetAsync = vi.fn(
            async () => GetSafePruningOffsetResponse.create({
                response: { oneofKind: "safePruningOffset", safePruningOffset: "42" },
            }),
        );

        const getPruningScheduleAsync = vi.fn(
            async () =>
                new GetPruningScheduleResponse({}),
        );

        const getParticipantPruningScheduleAsync = vi.fn(
            async () =>
                new GetParticipantPruningScheduleResponse({}),
        );

        const getNoWaitCommitmentsFromAsync = vi.fn(
            async () =>
                new GetNoWaitCommitmentsFromResponse({
                    ignoredParticipants: [],
                    notIgnoredParticipants: [],
                }),
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

        await client.getSafePruningOffsetAsync(
            GetSafePruningOffsetRequest.create({
                beforeOrAt: { seconds: "1767225600", nanos: 0 },
                ledgerEnd: "100",
            }),
            options,
        );

        await client.getScheduleAsync(
            new GetPruningScheduleRequest(),
            options,
        );

        await client.getParticipantScheduleAsync(
            new GetParticipantPruningScheduleRequest(),
            options,
        );

        await client.getNoWaitCommitmentsFromAsync(
            new GetNoWaitCommitmentsFromRequest({
                synchronizerIds: ["sync-1"],
                participantUids: ["participant-1"],
            }),
            options,
        );

        expect(getSafePruningOffsetAsync).toHaveBeenLastCalledWith(
            expect.any(Object),
            options,
        );
        expect(getPruningScheduleAsync).toHaveBeenLastCalledWith(
            expect.any(GetPruningScheduleRequest),
            options,
        );
        expect(getParticipantPruningScheduleAsync).toHaveBeenLastCalledWith(
            expect.any(GetParticipantPruningScheduleRequest),
            options,
        );
        expect(getNoWaitCommitmentsFromAsync).toHaveBeenLastCalledWith(
            expect.any(GetNoWaitCommitmentsFromRequest),
            options,
        );
    });
});
