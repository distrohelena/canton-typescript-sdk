import { afterEach, describe, expect, it, vi } from "vitest";
import {
    RequestOptions,
    TopologyAggregationServiceClient,
    TopologyListPartiesRequest,
    TopologyListPartiesResponse,
    WaitForPartyHostingRequest,
} from "../../../src";
import { comDigitalasset } from "../../../src/protobuf/index.js";

const ListPartiesResponse =
    comDigitalasset.canton.topology.admin.v30.ListPartiesResponse;
const ListPartiesResponseResult =
    comDigitalasset.canton.topology.admin.v30.ListPartiesResponse_Result;
const ParticipantPermission =
    comDigitalasset.canton.protocol.v30.Enums_ParticipantPermission;

const partyId = "party::namespace";
const participantId = "participant::namespace";
const synchronizerId = "sync::namespace";

function hostingResult(init: {
    party?: string;
    participant?: string;
    synchronizer?: string;
} = {}) {
    return ListPartiesResponseResult.create({
        party: init.party ?? partyId,
        participants: [{
            participantUid: init.participant ?? participantId,
            synchronizers: [{
                synchronizerId: init.synchronizer ?? synchronizerId,
                permission: ParticipantPermission.CONFIRMATION,
            }],
        }],
    });
}

afterEach(() => {
    vi.useRealTimers();
});

describe("TopologyAggregationServiceClient", () => {
    it("forwards topology aggregation requests through the selected transport", async () => {
        const topologyListPartiesAsync = vi.fn(
            async () =>
                new TopologyListPartiesResponse({
                    results: [],
                }),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            topologyListPartiesAsync,
        };

        const client = new TopologyAggregationServiceClient(transport as never);

        const request = new TopologyListPartiesRequest();

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.listPartiesAsync(request, options),
        ).resolves.toBeInstanceOf(TopologyListPartiesResponse);

        expect(topologyListPartiesAsync).toHaveBeenCalledWith(
            request,
            options,
        );
    });

    it("validates party-hosting wait requests before transport calls", () => {
        const valid = {
            partyId,
            participantId,
            synchronizerId,
        };

        expect(new WaitForPartyHostingRequest(valid)).toMatchObject({
            ...valid,
            timeoutMs: 30_000,
            pollIntervalMs: 500,
        });

        const invalidValues = [
            { partyId: "" },
            { partyId: "  " },
            { participantId: "" },
            { synchronizerId: "" },
            { timeoutMs: 0 },
            { timeoutMs: -1 },
            { timeoutMs: Number.NaN },
            { timeoutMs: Number.POSITIVE_INFINITY },
            { timeoutMs: 1.5 },
            { timeoutMs: Number.MAX_SAFE_INTEGER + 1 },
            { pollIntervalMs: -1 },
            { pollIntervalMs: Number.NaN },
            { pollIntervalMs: Number.NEGATIVE_INFINITY },
            { pollIntervalMs: 1.5 },
            { pollIntervalMs: Number.MAX_SAFE_INTEGER + 1 },
        ];

        for (const invalid of invalidValues) {
            expect(() => new WaitForPartyHostingRequest({
                ...valid,
                ...invalid,
            })).toThrow();
        }
    });

    it("returns an exact filtered hosting match and forwards request options", async () => {
        const result = hostingResult();
        const topologyListPartiesAsync = vi.fn(async () =>
            ListPartiesResponse.create({ results: [result] }),
        );
        const client = new TopologyAggregationServiceClient({
            topologyListPartiesAsync,
        } as never);
        const options = new RequestOptions({ timeoutMs: 5_000 });

        await expect(client.waitForPartyHostingAsync(
            new WaitForPartyHostingRequest({
                partyId,
                participantId,
                synchronizerId,
            }),
            options,
        )).resolves.toEqual(result);

        expect(topologyListPartiesAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                limit: 1,
                filterParty: partyId,
                filterParticipant: participantId,
                synchronizerIds: [synchronizerId],
            }),
            options,
        );
    });

    it("rejects a decoy party and retries until the exact hosting appears", async () => {
        vi.useFakeTimers();
        const decoy = hostingResult({ party: "party::decoy" });
        const wrongSynchronizer = hostingResult({ synchronizer: "sync::other" });
        const expected = hostingResult();
        const responses = [decoy, wrongSynchronizer, expected];
        const topologyListPartiesAsync = vi.fn(async () =>
            ListPartiesResponse.create({
                results: [responses.shift() ?? expected],
            }),
        );
        const client = new TopologyAggregationServiceClient({
            topologyListPartiesAsync,
        } as never);
        const options = new RequestOptions({ timeoutMs: 1_000 });

        const waiting = client.waitForPartyHostingAsync(
            new WaitForPartyHostingRequest({
                partyId,
                participantId,
                synchronizerId,
                pollIntervalMs: 5,
                timeoutMs: 20,
            }),
            options,
        );

        await vi.runAllTimersAsync();
        await expect(waiting).resolves.toEqual(expected);
        expect(topologyListPartiesAsync).toHaveBeenCalledTimes(3);
        expect(topologyListPartiesAsync.mock.calls.every(
            call => call[1] === options,
        )).toBe(true);
    });

    it("reports the last observed hosting when the wait times out", async () => {
        vi.useFakeTimers();
        const observed = hostingResult({
            party: "party::observed",
            participant: "participant::observed",
            synchronizer: "sync::observed",
        });
        const client = new TopologyAggregationServiceClient({
            topologyListPartiesAsync: async () =>
                ListPartiesResponse.create({ results: [observed] }),
        } as never);

        const waiting = expect(client.waitForPartyHostingAsync(
            new WaitForPartyHostingRequest({
                partyId,
                participantId,
                synchronizerId,
                pollIntervalMs: 5,
                timeoutMs: 10,
            }),
        )).rejects.toThrow(
            "party='party::observed', participants=[participant::observed@sync::observed]",
        );

        await vi.runAllTimersAsync();
        await waiting;
    });

    it("reports that no hosting was observed after empty responses", async () => {
        vi.useFakeTimers();
        const client = new TopologyAggregationServiceClient({
            topologyListPartiesAsync: async () =>
                ListPartiesResponse.create({ results: [] }),
        } as never);

        const waiting = expect(client.waitForPartyHostingAsync(
            new WaitForPartyHostingRequest({
                partyId,
                participantId,
                synchronizerId,
                pollIntervalMs: 5,
                timeoutMs: 10,
            }),
        )).rejects.toThrow("last observed hosting: none");

        await vi.runAllTimersAsync();
        await waiting;
    });

    it("propagates topology transport failures unchanged", async () => {
        const transportError = new Error("topology unavailable");
        const client = new TopologyAggregationServiceClient({
            topologyListPartiesAsync: async () => {
                throw transportError;
            },
        } as never);

        await expect(client.waitForPartyHostingAsync(
            new WaitForPartyHostingRequest({
                partyId,
                participantId,
                synchronizerId,
            }),
        )).rejects.toBe(transportError);
    });
});
