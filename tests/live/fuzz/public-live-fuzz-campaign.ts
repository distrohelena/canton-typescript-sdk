import { defineInvariantCampaign, InvariantCampaign } from "../../../src/testing/index.js";
import * as fc from "fast-check";

import { LiveFuzzConfig } from "./live-fuzz-config.js";
import { LiveFuzzCommand } from "./live-fuzz-commands.js";
import { liveFuzzExactInputArbitrary } from "./live-fuzz-campaign.js";

export interface PublicLiveFuzzAction {
    readonly actor: "issuer" | "owner";
    readonly targetKey: string;
    readonly command: LiveFuzzCommand;
    readonly amountSuffix: number;
    readonly campaignNonce: bigint;
}

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
            ...(config.path === undefined ? {} : { path: config.path }),
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

/**
 * Adapts the compatibility generator to the public runner's exact action
 * slots. The run-specific amount and nonce travel with every slot so one
 * setup context can execute, shrink, and clean up the whole sequence.
 */
export function createPublicLiveFuzzActionArbitrary(
    config: LiveFuzzConfig,
): fc.Arbitrary<readonly PublicLiveFuzzAction[]> {
    if (config.depthMode !== "exact") {
        throw new Error(
            "The public Main:Iou campaign requires exact FUZZ_LIVE_DEPTH mode.",
        );
    }

    return liveFuzzExactInputArbitrary({
        depth: config.depth,
        actionWeights: config.actionWeights,
        actors: config.actors,
        requireArchive: config.requireArchive,
    }).map((input) => input.commands.map((command) => ({
        actor: actionActor(command),
        targetKey: actionTargetKey(command),
        command,
        amountSuffix: input.amountSuffix,
        campaignNonce: input.campaignNonce,
    })));
}

function actionActor(command: LiveFuzzCommand): "issuer" | "owner" {
    return command.kind === "create" || command.kind === "exercise"
        ? "issuer"
        : command.participant;
}

function actionTargetKey(command: LiveFuzzCommand): string {
    switch (command.kind) {
        case "create":
            return "Main:Iou:Create";
        case "query":
            return "Main:Iou:Query";
        case "fetch":
            return "Main:Iou:Fetch";
        case "events":
            return "Main:Iou:Events";
        case "exercise":
            return "Main:Iou:Archive";
        case "probe":
            return "Main:Iou:Probe";
    }
}
