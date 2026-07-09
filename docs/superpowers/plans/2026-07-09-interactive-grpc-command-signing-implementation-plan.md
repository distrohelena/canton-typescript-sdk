# Interactive gRPC Command Signing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix SDK command submission so unsigned gRPC submissions support `userId`, and signed gRPC submissions use Ledger API interactive submission with real party signatures.

**Architecture:** Keep the public `commandService.submitAndWaitAsync(...)` surface unchanged, but move signing orchestration into the transport layer because only the gRPC transport can obtain the prepared transaction hash before invoking the signer. Ordinary submissions continue to use `CommandService.SubmitAndWait`; signed submissions use `InteractiveSubmissionService.PrepareSubmission` followed by `ExecuteSubmissionAndWait`.

**Tech Stack:** TypeScript, Vitest, protobuf-ts generated Ledger API v2 clients, existing gRPC/JSON transport abstractions

---

## File Structure

Implementation should stay within the current command pipeline, transport, and mapper boundaries.

- Modify: `src/core/types/requests/submit-command-request.ts`
- Modify: `src/core/signing/sign-command-request.ts`
- Modify: `src/core/signing/sign-command-result.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/services/commands/command-submission-pipeline.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/grpc/mappers/commands-mapper.ts`
- Create: `src/transports/grpc/mappers/interactive-command-mapper.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/index.ts`
- Modify: `DOCUMENTATION.md`
- Modify: `tests/fixtures/fake-grpc-services.ts`
- Modify: `tests/unit/types/request-validation.test.ts`
- Create: `tests/unit/signing/interactive-command-signing-contracts.test.ts`
- Modify: `tests/unit/services/command-submission-pipeline.test.ts`
- Modify: `tests/unit/services/grpc-command-signing.test.ts`
- Modify: `tests/unit/client/not-supported-signing.test.ts`
- Modify: `tests/unit/grpc/grpc-commands-mapper.test.ts`
- Create: `tests/unit/grpc/grpc-interactive-command-mapper.test.ts`
- Modify: `tests/unit/grpc/grpc-command-runtime.test.ts`
- Modify: `tests/integration/grpc/grpc-transport.integration.test.ts`
- Modify: `tests/contract/shared/command-submission.grpc.contract.test.ts`

The current canonical pre-sign payload builder is no longer the gRPC external signing path. After the transport refactor, either remove its command-signing role entirely or retain it only if another live SDK surface still uses it. Do not keep dead signing logic around.

## Task 1: Widen The Public Request And Signer Contracts

**Files:**
- Modify: `src/core/types/requests/submit-command-request.ts`
- Modify: `src/core/signing/sign-command-request.ts`
- Modify: `src/core/signing/sign-command-result.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/types/request-validation.test.ts`
- Create: `tests/unit/signing/interactive-command-signing-contracts.test.ts`

- [ ] **Step 1: Write the failing DTO contract tests**

```ts
import { describe, expect, it } from "vitest";
import {
    CreateCommand,
    SignCommandRequest,
    SignCommandResult,
    SubmitCommandRequest,
    ValidationError,
} from "../../../src";

describe("interactive command signing contracts", () => {
    it("stores submit request userId", () => {
        const request = new SubmitCommandRequest({
            applicationId: "app-1",
            userId: "wallet-user",
            actAs: ["Alice"],
            command: new CreateCommand({
                templateId: "Main:Iou",
                payload: {},
            }),
        });

        expect(request.userId).toBe("wallet-user");
    });

    it("stores signer request party context", () => {
        const request = new SignCommandRequest({
            payload: new Uint8Array([1, 2, 3]),
            party: "Alice",
            algorithmHint: "ed25519",
            keyId: "kid-1",
        });

        expect(request.party).toBe("Alice");
        expect(request.algorithmHint).toBe("ed25519");
        expect(request.keyId).toBe("kid-1");
    });

    it("requires signedBy on signer results", () => {
        expect(
            () =>
                new SignCommandResult({
                    algorithm: "ed25519",
                    signature: new Uint8Array([1, 2, 3]),
                    signedBy: "",
                }),
        ).toThrow(ValidationError);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `rtk npm test -- tests/unit/types/request-validation.test.ts tests/unit/signing/interactive-command-signing-contracts.test.ts`
Expected: FAIL because `SubmitCommandRequest` has no `userId`, `SignCommandRequest` lacks party fields, and `SignCommandResult` does not validate `signedBy`

- [ ] **Step 3: Implement the widened DTOs**

Required changes:

- `SubmitCommandRequest`
  - add `public readonly userId?: string`
  - plumb `init.userId`
- `SignCommandRequest`
  - add `party?: string`
  - add `algorithmHint?: string`
- `SignCommandResult`
  - add `signedBy: string`
  - validate non-empty `signature`
  - validate non-empty `signedBy`

Implementation sketch:

```ts
export class SubmitCommandRequest {
    public readonly userId?: string;

    public constructor(init: {
        applicationId: string;
        userId?: string;
        actAs: readonly string[];
        readAs?: readonly string[];
        command: LedgerCommand;
    }) {
        if (init.actAs.length === 0) {
            throw new ValidationError(
                "submit requests require at least one actAs party",
            );
        }

        this.applicationId = init.applicationId;
        this.userId = init.userId;
        this.actAs = init.actAs;
        this.readAs = init.readAs ?? [];
        this.command = init.command;
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `rtk npm test -- tests/unit/types/request-validation.test.ts tests/unit/signing/interactive-command-signing-contracts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/core/types/requests/submit-command-request.ts src/core/signing/sign-command-request.ts src/core/signing/sign-command-result.ts src/index.ts tests/unit/types/request-validation.test.ts tests/unit/signing/interactive-command-signing-contracts.test.ts
rtk git commit -m "feat: widen command signing contracts"
```

## Task 2: Refactor The Command Pipeline To Delegate Signing To The Transport

**Files:**
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/services/commands/command-submission-pipeline.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `tests/unit/services/command-submission-pipeline.test.ts`
- Modify: `tests/unit/services/grpc-command-signing.test.ts`
- Modify: `tests/unit/client/not-supported-signing.test.ts`

- [ ] **Step 1: Write the failing pipeline tests**

Replace the current assumption that the pipeline signs raw bytes before calling the transport. The new tests should prove:

- the pipeline passes the signer object into the transport instead of a precomputed `SignCommandResult`
- the pipeline does not build a canonical command payload for signed gRPC commands
- JSON still rejects signing at the transport boundary

Core assertion:

```ts
expect(submitCommandAsync).toHaveBeenLastCalledWith(
    request,
    expect.objectContaining({
        signAsync: expect.any(Function),
    }),
    options,
);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `rtk npm test -- tests/unit/services/command-submission-pipeline.test.ts tests/unit/services/grpc-command-signing.test.ts tests/unit/client/not-supported-signing.test.ts`
Expected: FAIL because `submitCommandAsync()` still accepts `SignCommandResult` and the pipeline still signs before transport execution

- [ ] **Step 3: Implement the transport-oriented signing contract**

Change the internal transport method signature from:

```ts
submitCommandAsync(
    request: SubmitCommandRequest,
    signed?: SignCommandResult,
    options?: RequestOptions,
): Promise<SubmitCommandResponse>;
```

to:

```ts
submitCommandAsync(
    request: SubmitCommandRequest,
    signer?: ICommandSigner,
    options?: RequestOptions,
): Promise<SubmitCommandResponse>;
```

Then simplify `CommandSubmissionPipeline.submitAsync(...)`:

```ts
return this.dependencies.transport.submitCommandAsync(
    request,
    this.dependencies.signer,
    options,
);
```

Keep the early `supportsCommandSigning` guard in the pipeline so JSON still fails fast before transport-specific work starts.

- [ ] **Step 4: Run tests to verify they pass**

Run: `rtk npm test -- tests/unit/services/command-submission-pipeline.test.ts tests/unit/services/grpc-command-signing.test.ts tests/unit/client/not-supported-signing.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/core/transports/transport.interface.ts src/services/commands/command-submission-pipeline.ts src/transports/json/json-transport.ts tests/unit/services/command-submission-pipeline.test.ts tests/unit/services/grpc-command-signing.test.ts tests/unit/client/not-supported-signing.test.ts
rtk git commit -m "refactor: move command signing orchestration into transport"
```

## Task 3: Add Interactive Submission Operation Wiring To The gRPC Channel Factory

**Files:**
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `tests/fixtures/fake-grpc-services.ts`

- [ ] **Step 1: Write the failing gRPC operation wiring tests**

Extend the fake gRPC operations surface so tests can capture:

- `prepareSubmissionAsync`
- `executeSubmissionAndWaitAsync`

Add a focused test that fails until `GrpcOperations` exposes both new methods.

Example shape:

```ts
expect(createFakeGrpcOperations()).toHaveProperty("prepareSubmissionAsync");
expect(createFakeGrpcOperations()).toHaveProperty("executeSubmissionAndWaitAsync");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `rtk npm test -- tests/unit/grpc/grpc-command-runtime.test.ts`
Expected: FAIL once the runtime test is updated to expect interactive methods on the fake operations surface

- [ ] **Step 3: Wire the interactive service client into the channel factory**

Required changes:

- import generated interactive service client types
- extend `GrpcOperations` with:
  - `prepareSubmissionAsync?(request, options?)`
  - `executeSubmissionAndWaitAsync?(request, options?)`
- extend `GrpcOperationDependencies` with a pick for interactive submission methods
- instantiate the generated interactive service client in the ledger surface
- expose ledger-surface wrappers that call:
  - `interactiveSubmissionServiceClient.prepareSubmission(...)`
  - `interactiveSubmissionServiceClient.executeSubmissionAndWait(...)`

Wrapper sketch:

```ts
async prepareSubmissionAsync(request, requestOptions) {
    const callOptions =
        await buildCallOptionsForLedgerSurfaceAsync(
            options,
            requestOptions,
        );

    return await unwrapUnaryResponse(
        interactiveSubmissionServiceClient.prepareSubmission(
            request as PrepareSubmissionRequest,
            callOptions,
        ),
    );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `rtk npm test -- tests/unit/grpc/grpc-command-runtime.test.ts`
Expected: PASS once the runtime surface can exercise the new operations

- [ ] **Step 5: Commit**

```bash
rtk git add src/transports/grpc/grpc-channel-factory.ts tests/fixtures/fake-grpc-services.ts tests/unit/grpc/grpc-command-runtime.test.ts
rtk git commit -m "feat: add grpc interactive submission operations"
```

## Task 4: Implement Plain And Interactive gRPC Command Mappers

**Files:**
- Modify: `src/transports/grpc/mappers/commands-mapper.ts`
- Create: `src/transports/grpc/mappers/interactive-command-mapper.ts`
- Modify: `tests/unit/grpc/grpc-commands-mapper.test.ts`
- Create: `tests/unit/grpc/grpc-interactive-command-mapper.test.ts`

- [ ] **Step 1: Write the failing mapper tests**

Add coverage for:

- plain `SubmitAndWait` request maps `userId`
- interactive `PrepareSubmissionRequest` maps `userId`, `commandId`, `actAs`, `readAs`, and command oneof
- interactive `ExecuteSubmissionAndWaitRequest` maps:
  - `preparedTransaction`
  - `partySignatures.signatures[0].party`
  - `partySignatures.signatures[0].signatures[0].signature`
  - `partySignatures.signatures[0].signatures[0].signedBy`
  - `userId`
  - `submissionId`
  - `hashingSchemeVersion`

Example assertion:

```ts
expect(payload.commands?.userId).toBe("wallet-user");
expect(executeRequest.partySignatures?.signatures[0]?.party).toBe("Alice");
expect(executeRequest.partySignatures?.signatures[0]?.signatures[0]?.signedBy)
    .toBe("fingerprint::1");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `rtk npm test -- tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/grpc/grpc-interactive-command-mapper.test.ts`
Expected: FAIL because `userId` is still empty and no interactive mappers exist

- [ ] **Step 3: Implement the plain and interactive mappers**

Keep `src/transports/grpc/mappers/commands-mapper.ts` focused on plain `Commands` and response mapping.

Required plain change:

```ts
userId: request.userId ?? "",
```

Create `interactive-command-mapper.ts` with:

- `mapGrpcPrepareSubmissionRequest(request: SubmitCommandRequest, commandId: string)`
- `mapGrpcExecuteSubmissionAndWaitRequest(init: { request: SubmitCommandRequest; preparedTransaction: PreparedTransaction; preparedTransactionHash: Uint8Array; hashingSchemeVersion: HashingSchemeVersion; submissionId: string; signerResult: SignCommandResult; })`
- `mapGrpcInteractiveSubmitCommand(payload: ExecuteSubmissionAndWaitResponse): SubmitCommandResponse`

Signature mapping sketch:

```ts
partySignatures: {
    signatures: [
        {
            party: request.actAs[0],
            signatures: [
                {
                    format: mapGrpcSigningAlgorithm(command.signerResult.algorithm),
                    signature: command.signerResult.signature,
                    signedBy: command.signerResult.signedBy,
                },
            ],
        },
    ],
},
```

Use the same `mapCommand(...)`, `mapValue(...)`, and `parseTemplateIdentifier(...)` patterns as the plain mapper. Do not duplicate command oneof logic unnecessarily; extract shared helpers if needed.

- [ ] **Step 4: Run tests to verify they pass**

Run: `rtk npm test -- tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/grpc/grpc-interactive-command-mapper.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/transports/grpc/mappers/commands-mapper.ts src/transports/grpc/mappers/interactive-command-mapper.ts tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/grpc/grpc-interactive-command-mapper.test.ts
rtk git commit -m "feat: map grpc interactive command submissions"
```

## Task 5: Dispatch Signed gRPC Submissions Through Interactive Execution

**Files:**
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `tests/unit/services/grpc-command-signing.test.ts`
- Modify: `tests/unit/grpc/grpc-command-runtime.test.ts`
- Modify: `tests/integration/grpc/grpc-transport.integration.test.ts`
- Modify: `tests/contract/shared/command-submission.grpc.contract.test.ts`

- [ ] **Step 1: Write the failing transport behavior tests**

Add tests for:

- unsigned gRPC submit still calls `submitCommandAsync`
- signed gRPC submit calls:
  - `prepareSubmissionAsync`
  - signer with prepared transaction hash
  - `executeSubmissionAndWaitAsync`
- signed gRPC submit rejects `actAs.length !== 1`

Core expectation:

```ts
expect(prepareSubmissionAsync).toHaveBeenCalledOnce();
expect(executeSubmissionAndWaitAsync).toHaveBeenCalledOnce();
expect(submitCommandAsync).not.toHaveBeenCalled();
expect(signAsync.mock.calls[0]?.[0].payload).toEqual(
    new Uint8Array([9, 9, 9]),
);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `rtk npm test -- tests/unit/services/grpc-command-signing.test.ts tests/unit/grpc/grpc-command-runtime.test.ts tests/integration/grpc/grpc-transport.integration.test.ts tests/contract/shared/command-submission.grpc.contract.test.ts`
Expected: FAIL because the transport still always calls plain submit and never prepares interactive submissions

- [ ] **Step 3: Implement signed-path dispatch in `GrpcTransport`**

Unsigned branch:

```ts
if (!signer) {
    const payload = await this.operations.submitCommandAsync(
        mapGrpcSubmitCommandRequest(request),
        options,
    );

    return mapGrpcSubmitCommand(payload as SubmitAndWaitResponse);
}
```

Signed branch:

```ts
if (request.actAs.length !== 1) {
    throw new ValidationError(
        "interactive gRPC command signing currently requires exactly one actAs party",
    );
}

const commandId = randomUUID();
const submissionId = randomUUID();

const prepared = await this.operations.prepareSubmissionAsync!(
    mapGrpcPrepareSubmissionRequest(request, commandId),
    options,
);

const signerResult = await signer.signAsync(
    new SignCommandRequest({
        payload: prepared.preparedTransactionHash,
        party: request.actAs[0],
        algorithmHint: "ed25519",
    }),
);

const executed = await this.operations.executeSubmissionAndWaitAsync!(
    mapGrpcExecuteSubmissionAndWaitRequest({
        request,
        preparedTransaction: prepared.preparedTransaction!,
        preparedTransactionHash: prepared.preparedTransactionHash,
        hashingSchemeVersion: prepared.hashingSchemeVersion,
        submissionId,
        signerResult,
    }),
    options,
);

return mapGrpcInteractiveSubmitCommand(executed);
```

Validate all required prepare response fields before calling the signer.

- [ ] **Step 4: Run tests to verify they pass**

Run: `rtk npm test -- tests/unit/services/grpc-command-signing.test.ts tests/unit/grpc/grpc-command-runtime.test.ts tests/integration/grpc/grpc-transport.integration.test.ts tests/contract/shared/command-submission.grpc.contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/transports/grpc/grpc-transport.ts tests/unit/services/grpc-command-signing.test.ts tests/unit/grpc/grpc-command-runtime.test.ts tests/integration/grpc/grpc-transport.integration.test.ts tests/contract/shared/command-submission.grpc.contract.test.ts
rtk git commit -m "feat: execute signed grpc commands interactively"
```

## Task 6: Update Public Documentation And Final Verification

**Files:**
- Modify: `DOCUMENTATION.md`
- Modify: any stale signing notes in `src/client/service-registry.ts` doc comments if needed

- [ ] **Step 1: Write the failing documentation assertions as checklist items**

Before editing docs, confirm the current gaps:

- `SubmitCommandRequest` docs do not mention `userId`
- docs imply generic gRPC external signing without describing interactive submission
- docs do not state the single-party limitation

- [ ] **Step 2: Update public docs**

Required doc changes:

- `SubmitCommandRequest` request fields include `userId?: string`
- `commandService.submitAndWaitAsync(...)`
  - unsigned gRPC uses `CommandService.SubmitAndWait`
  - signed gRPC uses interactive submission under the hood
  - JSON rejects signing
  - signed gRPC currently requires exactly one `actAs` party

Example wording:

```md
- `userId?: string`
- on `grpc`, unsigned submissions use `CommandService.SubmitAndWait`
- on `grpc`, signed submissions use the Ledger API interactive submission flow
- current external signing limitation: exactly one `actAs` party
```

- [ ] **Step 3: Run focused verification**

Run:

```bash
rtk npm test -- tests/unit/types/request-validation.test.ts tests/unit/signing/interactive-command-signing-contracts.test.ts tests/unit/services/command-submission-pipeline.test.ts tests/unit/services/grpc-command-signing.test.ts tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/grpc/grpc-interactive-command-mapper.test.ts tests/unit/grpc/grpc-command-runtime.test.ts tests/integration/grpc/grpc-transport.integration.test.ts tests/contract/shared/command-submission.grpc.contract.test.ts
rtk npm run build
```

Expected:

- all focused tests PASS
- build PASS

If lint is run, expect unrelated pre-existing repo-wide lint backlog unless those files have been cleaned separately. At minimum, run scoped ESLint on the touched files.

- [ ] **Step 4: Commit**

```bash
rtk git add DOCUMENTATION.md
rtk git commit -m "docs: describe interactive grpc command signing"
```

## Final Notes

- Do not reintroduce a fake detached-signature path on plain `SubmitAndWait`.
- Do not silently ignore `userId` on either plain or interactive gRPC requests.
- Prefer extracting shared command oneof helpers over copying create/exercise/exercise-by-key/create-and-exercise mapping logic twice.
- Keep JSON behavior unchanged except for the internal transport signature refactor needed to preserve the fast `NotSupportedError` path.

