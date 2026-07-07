import { describe, expect, it } from "vitest";
import {
    cantonClientLiveCoverage,
    liveCoverageStatuses,
} from "./canton-client-live-coverage.js";

describe("canton client live coverage matrix", () => {
    it("defines coverage entries for the public live surface", () => {
        expect(cantonClientLiveCoverage.length).toBeGreaterThan(0);
        expect(
            cantonClientLiveCoverage.find(
                (entry) =>
                    entry.member === "versionService.getLedgerApiVersionAsync",
            ),
        ).toMatchObject({
            member: "versionService.getLedgerApiVersionAsync",
            status: "covered",
            transports: ["grpc", "json"],
        });
    });

    it("contains unique entries with valid statuses", () => {
        const members = cantonClientLiveCoverage.map((entry) => entry.member);
        const uniqueMembers = new Set(members);

        expect(uniqueMembers.size).toBe(members.length);

        for (const entry of cantonClientLiveCoverage) {
            expect(liveCoverageStatuses).toContain(entry.status);
        }
    });

    it("requires reasons for non-covered entries", () => {
        for (const entry of cantonClientLiveCoverage) {
            if (entry.status !== "covered") {
                expect(entry.reason).toBeTruthy();
            }
        }

        expect(
            cantonClientLiveCoverage.find(
                (entry) =>
                    entry.member
                    === "topologyManagerReadService.listPartyToParticipantAsync",
            ),
        ).toMatchObject({
            status: "deferred-needs-write-path",
        });

        expect(
            cantonClientLiveCoverage.find(
                (entry) => entry.member === "commandService.submitAndWaitAsync",
            ),
        ).toMatchObject({
            status: "deferred-needs-domain-setup",
        });

        expect(
            cantonClientLiveCoverage.find(
                (entry) =>
                    entry.member === "stateService.getActiveContractsPageAsync",
            ),
        ).toMatchObject({
            status: "deferred-needs-domain-setup",
        });
    });
});
