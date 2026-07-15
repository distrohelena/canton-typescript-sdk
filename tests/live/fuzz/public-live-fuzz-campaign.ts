import { defineInvariantCampaign, InvariantCampaign } from "../../../src/testing/index.js";

import { LiveFuzzConfig } from "./live-fuzz-config.js";

/**
 * Compatibility definition for the existing Main:Iou live fixture.
 *
 * The legacy runner remains responsible for fixture-specific ACS assertions
 * while the public campaign owns Foundry-style run/depth/revert semantics.
 */
export function createPublicLiveFuzzCampaign(
    config: LiveFuzzConfig,
): InvariantCampaign {
    const actors = {
        issuer: {
            party: config.issuerParty ?? "issuer",
            participant: "issuer",
        },
        ...(config.actors.includes("owner")
            ? {
                owner: {
                    party: config.ownerParty ?? "owner",
                    participant: "owner",
                },
            }
            : {}),
    };

    const readableActors = [...config.actors];

    return defineInvariantCampaign({
        runtime: {
            actors,
            isolation: { kind: "external" },
        },
        config: {
            runs: config.numRuns,
            depth: config.depth,
            failOnRevert: config.failOnRevert,
            ...(config.seed === undefined ? {} : { seed: config.seed }),
            timeoutMs: config.testTimeoutMs,
        },
        targets: [
            { key: "Main:Iou:Create", actors: ["issuer"] },
            { key: "Main:Iou:Query", actors: readableActors },
            { key: "Main:Iou:Fetch", actors: readableActors },
            { key: "Main:Iou:Events", actors: readableActors },
            { key: "Main:Iou:Archive", actors: ["issuer"] },
            { key: "Main:Iou:Probe", actors: readableActors },
        ],
        invariants: [],
    });
}
