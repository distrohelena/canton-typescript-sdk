import { describe, expect, it } from "vitest";
import { ReplayDeterminismException } from "../../../../src/debugger/index.js";
import { ReplayDeterminismValidator } from "../../../../src/debugger/replay/replay-determinism-validator.js";
import { ReplayEntrypoint } from "../../../../src/debugger/replay/replay-entrypoint.js";

describe("ReplayDeterminismValidator", () => {
    it("accepts matching observed and replayed state effects", () => {
        const validator = new ReplayDeterminismValidator();

        expect(() =>
            validator.validateOrThrow(
                {
                    kind: "transaction",
                    offset: "42",
                    events: [
                        {
                            event: {
                                oneofKind: "exercised",
                                exercised: {
                                    contractId: "00abc",
                                    templateId: {
                                        packageId: "pkg-main",
                                        moduleName: "Main",
                                        entityName: "Vault",
                                    },
                                    choice: "Archive",
                                    choiceArgument: {},
                                },
                            },
                        },
                    ],
                    entrypoint: new ReplayEntrypoint({
                        kind: "exercise",
                        templateId: {
                            packageId: "pkg-main",
                            moduleName: "Main",
                            entityName: "Vault",
                        },
                        contractId: "00abc",
                        choice: "Archive",
                        argument: {},
                    }),
                },
                [
                    {
                        kind: "exercise",
                        contractId: "00abc",
                        templateId: {
                            packageId: "pkg-main",
                            moduleName: "Main",
                            entityName: "Vault",
                        },
                        choice: "Archive",
                        argument: {},
                    },
                ],
            ),
        ).not.toThrow();
    });

    it("rejects replay traces whose observed effects diverge from evaluation output", () => {
        const validator = new ReplayDeterminismValidator();

        expect(() =>
            validator.validateOrThrow(
                {
                    kind: "transaction",
                    offset: "42",
                    events: [
                        {
                            event: {
                                oneofKind: "exercised",
                                exercised: {
                                    contractId: "00abc",
                                    templateId: {
                                        packageId: "pkg-main",
                                        moduleName: "Main",
                                        entityName: "Vault",
                                    },
                                    choice: "Archive",
                                    choiceArgument: {},
                                },
                            },
                        },
                    ],
                    entrypoint: new ReplayEntrypoint({
                        kind: "exercise",
                        templateId: {
                            packageId: "pkg-main",
                            moduleName: "Main",
                            entityName: "Vault",
                        },
                        contractId: "00abc",
                        choice: "Archive",
                        argument: {},
                    }),
                },
                [
                    {
                        kind: "exercise",
                        contractId: "00abc",
                        templateId: {
                            packageId: "pkg-main",
                            moduleName: "Main",
                            entityName: "Vault",
                        },
                        choice: "Transfer",
                        argument: {},
                    },
                ],
            ),
        ).toThrow(ReplayDeterminismException);
    });
});
