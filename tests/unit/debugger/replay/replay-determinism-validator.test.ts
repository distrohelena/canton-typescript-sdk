import { describe, expect, it } from "vitest";
import { DAML_LF_CONTRACT_ID_MARKER_KEY } from "../../../../src/daml-lf/interpreter/daml-lf-runtime-value.js";
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

    it("accepts replay effects normalized from raw ledger-api values", () => {
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
                                    choiceArgument: {
                                        sum: {
                                            oneofKind: "record",
                                            record: {
                                                fields: [
                                                    {
                                                        label: "amount",
                                                        value: {
                                                            sum: {
                                                                oneofKind: "numeric",
                                                                numeric: "1.5000000000",
                                                            },
                                                        },
                                                    },
                                                    {
                                                        label: "linkedCid",
                                                        value: {
                                                            sum: {
                                                                oneofKind: "contractId",
                                                                contractId: "00def",
                                                            },
                                                        },
                                                    },
                                                ],
                                            },
                                        },
                                    },
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
                        argument: {
                            amount: "1.5000000000",
                            linkedCid: {
                                [DAML_LF_CONTRACT_ID_MARKER_KEY]: "00def",
                            },
                        },
                    },
                ],
            ),
        ).not.toThrow();
    });

    it("ignores non-observable fetch effects when comparing replay to ledger events", () => {
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
                        kind: "fetch",
                        contractId: "00abc",
                        templateId: {
                            packageId: "pkg-main",
                            moduleName: "Main",
                            entityName: "Vault",
                        },
                    },
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

    it("ignores replay-only null optional fields and record-id metadata when comparing arguments", () => {
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
                                    choice: "Transfer",
                                    choiceArgument: {
                                        sum: {
                                            oneofKind: "record",
                                            record: {
                                                fields: [
                                                    {
                                                        label: "receiverAccount",
                                                        value: {
                                                            sum: {
                                                                oneofKind: "record",
                                                                record: {
                                                                    fields: [
                                                                        {
                                                                            label: "owner",
                                                                            value: {
                                                                                sum: {
                                                                                    oneofKind: "party",
                                                                                    party: "Alice",
                                                                                },
                                                                            },
                                                                        },
                                                                        {
                                                                            label: "id",
                                                                            value: {
                                                                                sum: {
                                                                                    oneofKind: "text",
                                                                                    text: "acct-1",
                                                                                },
                                                                            },
                                                                        },
                                                                    ],
                                                                    recordId: {
                                                                        packageId: "pkg-account",
                                                                        moduleName: "Holding",
                                                                        entityName: "Account",
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                ],
                                                recordId: {
                                                    packageId: "pkg-main",
                                                    moduleName: "Main",
                                                    entityName: "Transfer",
                                                },
                                            },
                                        },
                                    },
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
                        choice: "Transfer",
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
                        argument: {
                            receiverAccount: {
                                owner: "Alice",
                                provider: null,
                                id: "acct-1",
                            },
                        },
                    },
                ],
            ),
        ).not.toThrow();
    });

    it("ignores ledger-assigned contract ids for create effects", () => {
        const validator = new ReplayDeterminismValidator();

        expect(() =>
            validator.validateOrThrow(
                {
                    kind: "transaction",
                    offset: "42",
                    events: [
                        {
                            event: {
                                oneofKind: "created",
                                created: {
                                    contractId: "00abc",
                                    templateId: {
                                        packageId: "pkg-main",
                                        moduleName: "Main",
                                        entityName: "Vault",
                                    },
                                    createArguments: {
                                        sum: {
                                            oneofKind: "record",
                                            record: {
                                                fields: [
                                                    {
                                                        label: "owner",
                                                        value: {
                                                            sum: {
                                                                oneofKind: "party",
                                                                party: "Alice",
                                                            },
                                                        },
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    ],
                    entrypoint: new ReplayEntrypoint({
                        kind: "create",
                        templateId: {
                            packageId: "pkg-main",
                            moduleName: "Main",
                            entityName: "Vault",
                        },
                        argument: {},
                    }),
                },
                [
                    {
                        kind: "create",
                        contractId: "created-1",
                        templateId: {
                            packageId: "pkg-main",
                            moduleName: "Main",
                            entityName: "Vault",
                        },
                        payload: {
                            owner: "Alice",
                        },
                    },
                ],
            ),
        ).not.toThrow();
    });

    it("treats numerically equivalent decimal strings as equal", () => {
        const validator = new ReplayDeterminismValidator();

        expect(() =>
            validator.validateOrThrow(
                {
                    kind: "transaction",
                    offset: "42",
                    events: [
                        {
                            event: {
                                oneofKind: "created",
                                created: {
                                    contractId: "00abc",
                                    templateId: {
                                        packageId: "pkg-main",
                                        moduleName: "Main",
                                        entityName: "Vault",
                                    },
                                    createArguments: {
                                        sum: {
                                            oneofKind: "record",
                                            record: {
                                                fields: [
                                                    {
                                                        label: "amount",
                                                        value: {
                                                            sum: {
                                                                oneofKind: "numeric",
                                                                numeric: "999997.1515642080",
                                                            },
                                                        },
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    ],
                    entrypoint: new ReplayEntrypoint({
                        kind: "create",
                        templateId: {
                            packageId: "pkg-main",
                            moduleName: "Main",
                            entityName: "Vault",
                        },
                        argument: {},
                    }),
                },
                [
                    {
                        kind: "create",
                        templateId: {
                            packageId: "pkg-main",
                            moduleName: "Main",
                            entityName: "Vault",
                        },
                        payload: {
                            amount: "999997.151564208",
                        },
                    },
                ],
            ),
        ).not.toThrow();
    });

    it("treats positional nested record payloads as equal to named ledger records", () => {
        const validator = new ReplayDeterminismValidator();

        expect(() =>
            validator.validateOrThrow(
                {
                    kind: "transaction",
                    offset: "42",
                    events: [
                        {
                            event: {
                                oneofKind: "created",
                                created: {
                                    contractId: "00abc",
                                    templateId: {
                                        packageId: "pkg-main",
                                        moduleName: "Main",
                                        entityName: "VaultEventMarker",
                                    },
                                    createArguments: {
                                        sum: {
                                            oneofKind: "record",
                                            record: {
                                                fields: [
                                                    {
                                                        label: "payload",
                                                        value: {
                                                            sum: {
                                                                oneofKind: "variant",
                                                                variant: {
                                                                    constructor: "EventVaultDeposit",
                                                                    value: {
                                                                        sum: {
                                                                            oneofKind: "record",
                                                                            record: {
                                                                                fields: [
                                                                                    {
                                                                                        label: "vaultIdentity",
                                                                                        value: {
                                                                                            sum: {
                                                                                                oneofKind: "record",
                                                                                                record: {
                                                                                                    fields: [
                                                                                                        {
                                                                                                            label: "admin",
                                                                                                            value: {
                                                                                                                sum: {
                                                                                                                    oneofKind: "party",
                                                                                                                    party: "Alice",
                                                                                                                },
                                                                                                            },
                                                                                                        },
                                                                                                        {
                                                                                                            label: "id",
                                                                                                            value: {
                                                                                                                sum: {
                                                                                                                    oneofKind: "text",
                                                                                                                    text: "vault-1",
                                                                                                                },
                                                                                                            },
                                                                                                        },
                                                                                                    ],
                                                                                                },
                                                                                            },
                                                                                        },
                                                                                    },
                                                                                ],
                                                                            },
                                                                        },
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    ],
                    entrypoint: new ReplayEntrypoint({
                        kind: "create",
                        templateId: {
                            packageId: "pkg-main",
                            moduleName: "Main",
                            entityName: "VaultEventMarker",
                        },
                        argument: {},
                    }),
                },
                [
                    {
                        kind: "create",
                        templateId: {
                            packageId: "pkg-main",
                            moduleName: "Main",
                            entityName: "VaultEventMarker",
                        },
                        payload: {
                            payload: {
                                constructor: "EventVaultDeposit",
                                value: {
                                    vaultIdentity: {
                                        0: "Alice",
                                        1: "vault-1",
                                    },
                                },
                            },
                        },
                    },
                ],
            ),
        ).not.toThrow();
    });

    it("maps synthetic created contract ids onto observed create ids for later effects", () => {
        const validator = new ReplayDeterminismValidator();

        expect(() =>
            validator.validateOrThrow(
                {
                    kind: "transaction",
                    offset: "42",
                    events: [
                        {
                            event: {
                                oneofKind: "created",
                                created: {
                                    contractId: "00created",
                                    templateId: {
                                        packageId: "pkg-main",
                                        moduleName: "Main",
                                        entityName: "Marker",
                                    },
                                    createArguments: {
                                        sum: {
                                            oneofKind: "record",
                                            record: {
                                                fields: [],
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        {
                            event: {
                                oneofKind: "exercised",
                                exercised: {
                                    contractId: "00created",
                                    templateId: {
                                        packageId: "pkg-main",
                                        moduleName: "Main",
                                        entityName: "Marker",
                                    },
                                    choice: "Archive",
                                    choiceArgument: {},
                                },
                            },
                        },
                    ],
                    entrypoint: new ReplayEntrypoint({
                        kind: "create",
                        templateId: {
                            packageId: "pkg-main",
                            moduleName: "Main",
                            entityName: "Marker",
                        },
                        argument: {},
                    }),
                },
                [
                    {
                        kind: "create",
                        templateId: {
                            packageId: "pkg-main",
                            moduleName: "Main",
                            entityName: "Marker",
                        },
                        payload: {},
                    },
                    {
                        kind: "exercise",
                        contractId: "created-1",
                        templateId: {
                            packageId: "pkg-main",
                            moduleName: "Main",
                            entityName: "Marker",
                        },
                        choice: "Archive",
                        argument: {},
                    },
                ],
            ),
        ).not.toThrow();
    });
});
