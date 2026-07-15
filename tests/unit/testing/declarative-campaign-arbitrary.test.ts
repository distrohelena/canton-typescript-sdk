import { describe, expect, test } from "vitest";
import * as fc from "fast-check";

import { defineInvariantCampaign } from "../../../src/testing/campaign/campaign-definition.js";
import {
    createDeclarativeCampaignArbitrary,
} from "../../../src/testing/daml/declarative-campaign-arbitrary.js";
import {
    createDamlTestingCatalog,
} from "../../../src/testing/daml/daml-testing-catalog.js";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfType } from "../../../src/daml-lf/model/daml-lf-type.js";
import { TestingConfigurationError } from "../../../src/testing/errors/testing-configuration-error.js";

describe("declarative campaign arbitrary", () => {
    test("generates exact-depth actions only from declared campaign targets and actors", () => {
        const campaign = defineInvariantCampaign({
            runtime: {
                actors: {
                    issuer: { party: "Issuer", participant: "participant-a" },
                    owner: { party: "Owner", participant: "participant-b" },
                },
                isolation: { kind: "external" },
            },
            config: { runs: 1, depth: 4 },
            targets: [
                { key: "pkg:Main:Iou:create", actors: ["issuer"] },
                { key: "pkg:Main:Iou:ChangeAmount", actors: ["issuer", "owner"] },
            ],
            invariants: [],
        });

        const catalog = createDamlTestingCatalog({
            getTemplates: () => [{
                templateId: {
                    packageId: "pkg",
                    moduleName: "Main",
                    templateName: "Iou",
                },
                fields: [],
                choices: [{
                    name: "ChangeAmount",
                    parameter: {
                        type: new DamlLfType({ builtinType: DamlLfBuiltinType.int64 }),
                    },
                }],
            }],
        });

        const values = fc.sample(createDeclarativeCampaignArbitrary({
            campaign,
            catalog,
            targets: [
                {
                    key: "pkg:Main:Iou:create",
                    templateId: "pkg:Main:Iou",
                    actors: ["issuer"],
                    kind: "create",
                },
                {
                    key: "pkg:Main:Iou:ChangeAmount",
                    templateId: "pkg:Main:Iou",
                    choice: "ChangeAmount",
                    actors: ["issuer", "owner"],
                },
            ],
        }), { seed: 19, numRuns: 12 });

        expect(values.every((actions) => actions.length === 4)).toBe(true);
        expect(values.flat().every((action) =>
            campaign.targets.some((target) =>
                target.key === action.targetKey && (target.actors ?? []).includes(action.actor))))
            .toBe(true);
    });

    test("rejects resolved targets absent from the campaign definition", () => {
        const campaign = defineInvariantCampaign({
            runtime: {
                actors: { issuer: { party: "Issuer", participant: "participant-a" } },
                isolation: { kind: "external" },
            },
            config: { runs: 1, depth: 1 },
            targets: [{ key: "pkg:Main:Iou:create", actors: ["issuer"] }],
            invariants: [],
        });

        expect(() => createDeclarativeCampaignArbitrary({
            campaign,
            catalog: createDamlTestingCatalog({ getTemplates: () => [] }),
            targets: [{
                key: "pkg:Main:Iou:Archive",
                templateId: "pkg:Main:Iou",
                choice: "Archive",
                actors: ["issuer"],
            }],
        })).toThrow(TestingConfigurationError);
    });
});
