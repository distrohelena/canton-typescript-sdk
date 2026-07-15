import { describe, expect, test } from "vitest";

describe("defineInvariantCampaign", () => {
    test("defaults failOnRevert to false without retaining mutable input", async () => {
        const modulePath = "../../../src/testing/index.js";

        const { defineInvariantCampaign } = await import(modulePath);

        const targets = [{ key: "read", actors: ["issuer"] }];

        const campaign = defineInvariantCampaign({
            runtime: {
                actors: {
                    issuer: {
                        party: "Issuer",
                        participant: "participant-a",
                    },
                },
                isolation: { kind: "external" },
            },
            config: { runs: 2, depth: 3 },
            targets,
            invariants: [],
        });

        targets[0].key = "changed-after-definition";

        expect(campaign.config).toEqual({
            runs: 2,
            depth: 3,
            failOnRevert: false,
        });
        expect(campaign.targets).toEqual([{ key: "read", actors: ["issuer"] }]);
        expect(Object.isFrozen(campaign.config)).toBe(true);
        expect(Object.isFrozen(campaign.targets)).toBe(true);
    });

    test("rejects targets that reference an unknown actor", async () => {
        const modulePath = "../../../src/testing/index.js";

        const { defineInvariantCampaign } = await import(modulePath);

        expect(() =>
            defineInvariantCampaign({
                runtime: {
                    actors: {
                        issuer: {
                            party: "Issuer",
                            participant: "participant-a",
                        },
                    },
                    isolation: { kind: "external" },
                },
                config: { runs: 1, depth: 1 },
                targets: [{ key: "read", actors: ["missing"] }],
                invariants: [],
            }),
        ).toThrow("unknown actor 'missing'");
    });

    test("rejects a campaign with no executable targets", async () => {
        const modulePath = "../../../src/testing/index.js";

        const { defineInvariantCampaign } = await import(modulePath);

        expect(() =>
            defineInvariantCampaign({
                runtime: {
                    actors: {
                        issuer: {
                            party: "Issuer",
                            participant: "participant-a",
                        },
                    },
                    isolation: { kind: "external" },
                },
                config: { runs: 1, depth: 1 },
                targets: [],
                invariants: [],
            }),
        ).toThrow("at least one target");
    });

    test("rejects duplicate target keys before campaign execution", async () => {
        const modulePath = "../../../src/testing/index.js";

        const { defineInvariantCampaign } = await import(modulePath);

        expect(() =>
            defineInvariantCampaign({
                runtime: {
                    actors: {
                        issuer: {
                            party: "Issuer",
                            participant: "participant-a",
                        },
                    },
                    isolation: { kind: "external" },
                },
                config: { runs: 1, depth: 1 },
                targets: [
                    { key: "Main:Iou:Create", actors: ["issuer"] },
                    { key: "Main:Iou:Create", actors: ["issuer"] },
                ],
                invariants: [],
            }),
        ).toThrow("target 'Main:Iou:Create' is duplicated");
    });

    test("requires discovery cleanup for mutating handlers on cleanup isolation", async () => {
        const modulePath = "../../../src/testing/index.js";

        const { defineInvariantCampaign, handler } = await import(modulePath);

        expect(() =>
            defineInvariantCampaign({
                runtime: {
                    actors: {
                        issuer: {
                            party: "Issuer",
                            participant: "participant-a",
                        },
                    },
                    isolation: { kind: "cleanup" },
                },
                config: { runs: 1, depth: 1 },
                targets: [{ key: "write", actors: ["issuer"] }],
                handlers: [handler("write", { cleanup: "none" })],
                invariants: [],
            }),
        ).toThrow("discovery cleanup");
    });
});
