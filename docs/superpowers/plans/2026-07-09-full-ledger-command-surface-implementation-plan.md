# Full Ledger Command Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `SubmitCommandRequest` and `commandService.submitAndWaitAsync(...)` from create-only submission to the full Ledger API v2 command set across gRPC and JSON.

**Architecture:** Keep one shared SDK command model with SDK-owned DTO classes for `CreateCommand`, `ExerciseCommand`, `ExerciseByKeyCommand`, and `CreateAndExerciseCommand`, then map that union inside the existing command submission pipeline. Reuse the same DTO set for canonical payload signing, gRPC protobuf mapping, and JSON V2 `/v2/commands/submit-and-wait` submission so later interactive or external-signing flows do not need a second command model.

**Tech Stack:** TypeScript, Vitest, existing protobuf-ts generated Ledger API types, existing JSON transport adapter, Digital Asset JSON Ledger API V2 command shape

---

## File Structure

Implementation should stay within the existing command pipeline and transport boundaries:

- Create: `src/core/types/commands/exercise-command.ts`
- Create: `src/core/types/commands/exercise-by-key-command.ts`
- Create: `src/core/types/commands/create-and-exercise-command.ts`
- Create: `src/core/types/commands/ledger-command.ts`
- Modify: `src/core/types/commands/create-command.ts`
- Modify: `src/core/types/requests/submit-command-request.ts`
- Modify: `src/services/commands/command-payload-builder.ts`
- Modify: `src/transports/grpc/mappers/commands-mapper.ts`
- Modify: `src/transports/json/mappers/commands-mapper.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/index.ts`
- Modify: `DOCUMENTATION.md`
- Modify: `tests/unit/types/request-validation.test.ts`
- Create: `tests/unit/types/ledger-command-types.test.ts`
- Create: `tests/unit/services/command-payload-builder.test.ts`
- Modify: `tests/unit/services/command-submission-pipeline.test.ts`
- Create: `tests/unit/grpc/grpc-commands-mapper.test.ts`
- Modify: `tests/unit/grpc/grpc-command-runtime.test.ts`
- Create: `tests/unit/json/json-command-submission.test.ts`
- Modify: `tests/integration/json/json-transport.integration.test.ts`
- Modify: `tests/integration/grpc/grpc-transport.integration.test.ts`
- Modify: `tests/contract/shared/command-submission.grpc.contract.test.ts`

Do not invent vault-specific helpers in this pass. Keep the surface aligned to the Ledger API command model.

The JSON side should migrate command submission from the current legacy `/v1/create` special-case to the generic V2 command endpoint documented in the official OpenAPI:

- `POST /v2/commands/submit-and-wait`

## Task 1: Add SDK Command DTOs, Union Type, And Request Widening

**Files:**
- Create: `src/core/types/commands/exercise-command.ts`
- Create: `src/core/types/commands/exercise-by-key-command.ts`
- Create: `src/core/types/commands/create-and-exercise-command.ts`
- Create: `src/core/types/commands/ledger-command.ts`
- Modify: `src/core/types/commands/create-command.ts`
- Modify: `src/core/types/requests/submit-command-request.ts`
- Modify: `src/index.ts`
- Create: `tests/unit/types/ledger-command-types.test.ts`
- Modify: `tests/unit/types/request-validation.test.ts`

- [ ] **Step 1: Write the failing command DTO and request tests**

```ts
import { describe, expect, it } from "vitest";
import {
    CreateAndExerciseCommand,
    CreateCommand,
    ExerciseByKeyCommand,
    ExerciseCommand,
    SubmitCommandRequest,
    ValidationError,
} from "../../../src";

describe("ledger command sdk types", () => {
    it("stores exercise command fields", () => {
        const command = new ExerciseCommand({
            templateId: "Main:Vault",
            contractId: "00abc",
            choice: "Deposit",
            argument: { amount: "10.0" },
        });

        expect(command.templateId).toBe("Main:Vault");
        expect(command.contractId).toBe("00abc");
        expect(command.choice).toBe("Deposit");
        expect(command.argument).toEqual({ amount: "10.0" });
    });

    it("stores exercise-by-key command fields", () => {
        const command = new ExerciseByKeyCommand({
            templateId: "Main:Vault",
            contractKey: { issuer: "Alice", id: "vault-1" },
            choice: "Redeem",
            argument: { amount: "5.0" },
        });

        expect(command.contractKey).toEqual({ issuer: "Alice", id: "vault-1" });
    });

    it("stores create-and-exercise command fields", () => {
        const command = new CreateAndExerciseCommand({
            templateId: "Main:VaultFactory",
            payload: { owner: "Alice" },
            choice: "CreateVault",
            argument: { currency: "USD" },
        });

        expect(command.payload).toEqual({ owner: "Alice" });
        expect(command.choice).toBe("CreateVault");
    });

    it("accepts every command kind in submit requests", () => {
        const requests = [
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new CreateCommand({
                    templateId: "Main:Iou",
                    payload: {},
                }),
            }),
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new ExerciseCommand({
                    templateId: "Main:Iou",
                    contractId: "00abc",
                    choice: "Archive",
                    argument: {},
                }),
            }),
        ];

        expect(requests).toHaveLength(2);
    });

    it("rejects empty required command fields", () => {
        expect(
            () =>
                new ExerciseCommand({
                    templateId: "",
                    contractId: "00abc",
                    choice: "Archive",
                    argument: {},
                }),
        ).toThrow(ValidationError);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/types/ledger-command-types.test.ts tests/unit/types/request-validation.test.ts`
Expected: FAIL with missing exports, missing DTOs, and `SubmitCommandRequest` still typed as `CreateCommand`

- [ ] **Step 3: Implement the widened public command model**

Add SDK DTO classes:

```ts
export class ExerciseCommand {
    public readonly templateId: string;
    public readonly contractId: string;
    public readonly choice: string;
    public readonly argument: unknown;

    public constructor(init: {
        templateId: string;
        contractId: string;
        choice: string;
        argument: unknown;
    }) {
        if (!init.templateId) {
            throw new ValidationError("exercise commands require a templateId");
        }
        if (!init.contractId) {
            throw new ValidationError("exercise commands require a contractId");
        }
        if (!init.choice) {
            throw new ValidationError("exercise commands require a choice");
        }

        this.templateId = init.templateId;
        this.contractId = init.contractId;
        this.choice = init.choice;
        this.argument = init.argument;
    }
}

export type LedgerCommand =
    | CreateCommand
    | ExerciseCommand
    | ExerciseByKeyCommand
    | CreateAndExerciseCommand;
```

Update `SubmitCommandRequest`:

```ts
public readonly command: LedgerCommand;
```

Export all new public types from `src/index.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/types/ledger-command-types.test.ts tests/unit/types/request-validation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/types/commands src/core/types/requests/submit-command-request.ts src/index.ts tests/unit/types/ledger-command-types.test.ts tests/unit/types/request-validation.test.ts
git commit -m "feat: add full ledger command dto surface"
```

## Task 2: Redesign Canonical Command Payloads For The Full Command Union

**Files:**
- Modify: `src/services/commands/command-payload-builder.ts`
- Create: `tests/unit/services/command-payload-builder.test.ts`
- Modify: `tests/unit/services/command-submission-pipeline.test.ts`

- [ ] **Step 1: Write the failing canonical payload tests**

```ts
import { describe, expect, it } from "vitest";
import {
    ExerciseCommand,
    SubmitCommandRequest,
} from "../../../src";
import { buildCanonicalCommandPayload } from "../../../src/services/commands/command-payload-builder.js";

describe("command payload builder", () => {
    it("encodes command kind and command-specific exercise fields", () => {
        const payload = buildCanonicalCommandPayload(
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                readAs: ["Bob"],
                command: new ExerciseCommand({
                    templateId: "Main:Vault",
                    contractId: "00abc",
                    choice: "Deposit",
                    argument: { amount: "10.0" },
                }),
            }),
        );

        expect(new TextDecoder().decode(payload)).toContain("\"kind\":\"exercise\"");
        expect(new TextDecoder().decode(payload)).toContain("\"contractId\":\"00abc\"");
        expect(new TextDecoder().decode(payload)).toContain("\"choice\":\"Deposit\"");
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/services/command-payload-builder.test.ts tests/unit/services/command-submission-pipeline.test.ts`
Expected: FAIL because the payload builder still emits only `templateId` and `payload`

- [ ] **Step 3: Implement deterministic union-aware canonical payloads**

Refactor the payload builder to branch on command kind:

```ts
function mapCanonicalCommand(command: LedgerCommand): unknown {
    if (command instanceof CreateCommand) {
        return {
            kind: "create",
            templateId: command.templateId,
            payload: command.payload,
        };
    }

    if (command instanceof ExerciseCommand) {
        return {
            kind: "exercise",
            templateId: command.templateId,
            contractId: command.contractId,
            choice: command.choice,
            argument: command.argument,
        };
    }

    // exercise-by-key and create-and-exercise follow the same pattern
}
```

Keep outer payload shape stable:

```ts
{
    applicationId: request.applicationId,
    actAs: request.actAs,
    readAs: request.readAs,
    command: mapCanonicalCommand(request.command),
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/services/command-payload-builder.test.ts tests/unit/services/command-submission-pipeline.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/commands/command-payload-builder.ts tests/unit/services/command-payload-builder.test.ts tests/unit/services/command-submission-pipeline.test.ts
git commit -m "feat: widen canonical command payload builder"
```

## Task 3: Extend gRPC Command Mapping To Every Ledger Command Kind

**Files:**
- Modify: `src/transports/grpc/mappers/commands-mapper.ts`
- Create: `tests/unit/grpc/grpc-commands-mapper.test.ts`
- Modify: `tests/unit/grpc/grpc-command-runtime.test.ts`
- Modify: `tests/integration/grpc/grpc-transport.integration.test.ts`
- Modify: `tests/contract/shared/command-submission.grpc.contract.test.ts`

- [ ] **Step 1: Write the failing gRPC mapper tests**

```ts
import { describe, expect, it } from "vitest";
import {
    CreateAndExerciseCommand,
    ExerciseByKeyCommand,
    ExerciseCommand,
    SubmitCommandRequest,
} from "../../../src";
import { mapGrpcSubmitCommandRequest } from "../../../src/transports/grpc/mappers/commands-mapper.js";

describe("gRPC commands mapper", () => {
    it("maps exercise commands to protobuf exercise oneofs", () => {
        const request = mapGrpcSubmitCommandRequest(
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new ExerciseCommand({
                    templateId: "Main:Vault",
                    contractId: "00abc",
                    choice: "Deposit",
                    argument: { amount: "10.0" },
                }),
            }),
        );

        expect(request.commands?.commands[0].command.oneofKind).toBe("exercise");
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/grpc/grpc-command-runtime.test.ts`
Expected: FAIL because the mapper always emits `"create"`

- [ ] **Step 3: Implement minimal gRPC union mapping**

Replace the create-only helper with a union switch:

```ts
function mapSdkCommand(command: LedgerCommand): Command {
    if (command instanceof CreateCommand) {
        return {
            command: {
                oneofKind: "create",
                create: {
                    templateId: parseTemplateIdentifier(command.templateId),
                    createArguments: mapRecord(command.payload),
                },
            },
        };
    }

    if (command instanceof ExerciseCommand) {
        return {
            command: {
                oneofKind: "exercise",
                exercise: {
                    templateId: parseTemplateIdentifier(command.templateId),
                    contractId: command.contractId,
                    choice: command.choice,
                    choiceArgument: mapValue(command.argument),
                },
            },
        };
    }

    // add exerciseByKey and createAndExercise branches
}
```

Update `mapGrpcSubmitCommandRequest(...)` to use:

```ts
commands: [mapSdkCommand(request.command)]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/grpc/grpc-command-runtime.test.ts tests/integration/grpc/grpc-transport.integration.test.ts tests/contract/shared/command-submission.grpc.contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/transports/grpc/mappers/commands-mapper.ts tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/grpc/grpc-command-runtime.test.ts tests/integration/grpc/grpc-transport.integration.test.ts tests/contract/shared/command-submission.grpc.contract.test.ts
git commit -m "feat: map full ledger command set on grpc"
```

## Task 4: Migrate JSON Command Submission To V2 Generic Commands

**Files:**
- Modify: `src/transports/json/mappers/commands-mapper.ts`
- Modify: `src/transports/json/json-transport.ts`
- Create: `tests/unit/json/json-command-submission.test.ts`
- Modify: `tests/integration/json/json-transport.integration.test.ts`

- [ ] **Step 1: Write failing JSON submission tests against the V2 command endpoint**

Use the official JSON Ledger API V2 path and envelope:

```ts
expect(capturedPath).toBe("/v2/commands/submit-and-wait");
expect(capturedBody).toMatchObject({
    commands: {
        actAs: ["Alice"],
        readAs: ["Bob"],
        commands: expect.any(Array),
    },
});

expect(JSON.stringify(capturedBody)).toContain("\"templateId\":\"Main:Vault\"");
expect(JSON.stringify(capturedBody)).toContain("\"contractId\":\"00abc\"");
expect(JSON.stringify(capturedBody)).toContain("\"choice\":\"Deposit\"");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/json/json-command-submission.test.ts tests/integration/json/json-transport.integration.test.ts`
Expected: FAIL because JSON transport still posts create commands to `/v1/create`

- [ ] **Step 3: Implement JSON V2 command mapping**

Add JSON request mapping helpers in `src/transports/json/mappers/commands-mapper.ts`:

```ts
export function mapJsonSubmitCommandRequest(
    request: SubmitCommandRequest,
): {
    commands: {
        workflowId: string;
        userId: string;
        commandId: string;
        commands: unknown[];
        actAs: string[];
        readAs: string[];
        submissionId: string;
        disclosedContracts: unknown[];
        synchronizerId: string;
        packageIdSelectionPreference: string[];
        prefetchContractKeys: unknown[];
    };
} {
    return {
        commands: {
            workflowId: "",
            userId: "",
            commandId: crypto.randomUUID(),
            commands: [mapJsonCommand(request.command)],
            actAs: [...request.actAs],
            readAs: [...request.readAs],
            submissionId: "",
            disclosedContracts: [],
            synchronizerId: "",
            packageIdSelectionPreference: [],
            prefetchContractKeys: [],
        },
    };
}
```

`mapJsonCommand(request.command)` must emit the exact command entry shape required by the official OpenAPI `JsCommands.commands[]` schema for:

- create
- exercise
- exercise-by-key
- create-and-exercise

Switch `json-transport.ts` from:

```ts
"/v1/create"
```

to:

```ts
"/v2/commands/submit-and-wait"
```

and post the mapped V2 `commands` envelope instead of the legacy create shortcut body.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/json/json-command-submission.test.ts tests/integration/json/json-transport.integration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/transports/json/mappers/commands-mapper.ts src/transports/json/json-transport.ts tests/unit/json/json-command-submission.test.ts tests/integration/json/json-transport.integration.test.ts
git commit -m "feat: move json command submission to v2 commands"
```

## Task 5: Update Documentation And Run Broad Verification

**Files:**
- Modify: `DOCUMENTATION.md`
- Verify: `src/index.ts`
- Verify: command-related tests already touched above

- [ ] **Step 1: Update the public command documentation**

Document:

- widened `SubmitCommandRequest.command`
- `CreateCommand`
- `ExerciseCommand`
- `ExerciseByKeyCommand`
- `CreateAndExerciseCommand`
- gRPC and JSON support for `commandService.submitAndWaitAsync(...)`
- canonical payload note for external signing

Include examples for all four command kinds.

- [ ] **Step 2: Run focused command verification**

Run:

```bash
npm test -- tests/unit/types/ledger-command-types.test.ts tests/unit/types/request-validation.test.ts tests/unit/services/command-payload-builder.test.ts tests/unit/services/command-submission-pipeline.test.ts tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/grpc/grpc-command-runtime.test.ts tests/unit/json/json-command-submission.test.ts tests/integration/grpc/grpc-transport.integration.test.ts tests/integration/json/json-transport.integration.test.ts tests/contract/shared/command-submission.grpc.contract.test.ts
```

Expected: PASS

- [ ] **Step 3: Run full project build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add DOCUMENTATION.md
git commit -m "docs: document full ledger command submission surface"
```

- [ ] **Step 5: Optional final safety run**

Run: `npm test`
Expected: PASS or known unrelated failures only
