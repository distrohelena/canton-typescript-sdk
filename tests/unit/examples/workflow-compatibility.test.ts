import { RequestOptions } from "@distrohelena/canton-typescript-sdk";
import { comDigitalasset } from "@distrohelena/canton-typescript-sdk/protobuf";
import { describe, expect, it, vi } from "vitest";
import {
    parseWorkflowReleaseCore,
    readWorkflowCompatibilityAsync,
} from "../../../examples/shared/workflow-compatibility.js";

describe("parseWorkflowReleaseCore", () => {
    it.each([
        ["3.5.7", "3.5.7"],
        ["3.5.8", "3.5.8"],
        ["3.5.8-SNAPSHOT", "3.5.8"],
        ["3.5.8+build.1", "3.5.8"],
    ])("parses the anchored supported release core from %s", (version, core) => {
        expect(parseWorkflowReleaseCore(version)).toBe(core);
    });

    it.each(["3.5.80", "3.5", "release-3.5.8", "3.5.9", ""]) (
        "rejects an unsupported or non-anchored participant version %j",
        version => {
            expect(() => parseWorkflowReleaseCore(version)).toThrow(/version/i);
        },
    );
});

describe("readWorkflowCompatibilityAsync", () => {
    it("reads active participant status with a fresh remaining-timeout RequestOptions", async () => {
        const getParticipantStatusAsync = vi.fn().mockResolvedValue(activeStatus("3.5.8+build.1"));

        const remainingTimeoutMs = vi.fn().mockReturnValue(456);

        await expect(
            readWorkflowCompatibilityAsync(
                { participantStatusService: { getParticipantStatusAsync } } as never,
                { remainingTimeoutMs },
            ),
        ).resolves.toEqual({
            participantVersion: "3.5.8+build.1",
            releaseCore: "3.5.8",
            path: "common",
            acceptedGrpcCodes: {
                invalidChoice: ["INVALID_ARGUMENT"],
                duplicateCommand: ["ALREADY_EXISTS"],
                staleContract: ["INVALID_ARGUMENT"],
            },
        });
        expect(remainingTimeoutMs).toHaveBeenCalledOnce();
        expect(getParticipantStatusAsync).toHaveBeenCalledWith(
            expect.objectContaining({}),
            expect.any(RequestOptions),
        );
        expect(getParticipantStatusAsync.mock.calls[0]?.[1]?.timeoutMs).toBe(456);
        expect(
            comDigitalasset.canton.admin.participant.v30.ParticipantStatusRequest.is(
                getParticipantStatusAsync.mock.calls[0]?.[0],
            ),
        ).toBe(true);
    });

    it.each([
        ["not initialized", { kind: { oneofKind: "notInitialized", notInitialized: {} } }],
        ["missing status kind", { kind: { oneofKind: undefined } }],
        ["passive status", activeStatus("3.5.8", false)],
        ["missing common status", { kind: { oneofKind: "status", status: { active: true } } }],
        ["empty version", activeStatus(" ")],
    ])("rejects %s", async (_name, response) => {
        await expect(
            readWorkflowCompatibilityAsync(
                {
                    participantStatusService: {
                        getParticipantStatusAsync: vi.fn().mockResolvedValue(response),
                    },
                } as never,
                { remainingTimeoutMs: () => 100 },
            ),
        ).rejects.toThrow(/participant/i);
    });
});

function activeStatus(version: string, active = true): unknown {
    return {
        kind: {
            oneofKind: "status",
            status: { active, commonStatus: { version } },
        },
    };
}
