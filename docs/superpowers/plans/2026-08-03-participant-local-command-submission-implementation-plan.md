# Participant-Local Command Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signer-configured `CommandServiceClient` explicitly submit participant-hosted commands without invoking the external signer, and prove the path on Canton Participant 3.5.7 and 3.5.8.

**Architecture:** Add an explicit high-level `submitParticipantLocalAndWaitAsync` method that delegates through `CommandSubmissionPipeline` to the existing transport `submitCommandAsync` operation with an absent signer. Reuse the established ordinary gRPC/JSON submission implementations; do not add a transport capability or touch interactive execute mapping. Add one standalone example whose client has a deliberately failing external signer, so a successful hosted-party transaction proves the participant-local branch.

**Tech Stack:** TypeScript ESM, Vitest 3, existing `CommandServiceClient`/`CommandSubmissionPipeline`, gRPC `CommandService.SubmitAndWait`, existing application DAR fixture, authenticated Canton Participants 3.5.7 and 3.5.8.

## Global Constraints

- Work directly on `main`; preserve unrelated user changes.
- Use `apply_patch` for file edits and prefix shell commands with `rtk`.
- Invoke Vitest only as `rtk proxy npx vitest`.
- Follow strict RED/GREEN TDD for production behavior.
- `submitParticipantLocalAndWaitAsync` must never invoke or forward a configured signer.
- Do not call `InteractiveSubmissionService` for participant-local submission.
- Do not change generated protobufs, localnet configuration, or existing submission semantics.
- Do not print or persist bearer tokens during live verification.

---

## File Structure

- `src/services/commands/command-submission-pipeline.ts` — owns the explicit authorization-route choice and drops the configured signer for participant-local calls.
- `src/services/command/command-service-client.ts` — exposes the public participant-local method.
- `tests/unit/services/command-submission-pipeline.test.ts` — protects signer bypass, argument identity, ordered batches, options, and response propagation.
- `tests/unit/services/grpc-command-signing.test.ts` — protects the public client-to-real-gRPC-transport route from accidentally preparing, signing, or interactively executing.
- `examples/shared/localnet.ts` and `tests/unit/examples/localnet.test.ts` — allow examples to construct a normal client with an injected signer and prove that option is preserved.
- `examples/98-participant-local-command-submission.ts` — standalone live proof using a hosted party and a deliberately failing external signer.
- `package.json`, `README.md`, and `DOCUMENTATION.md` — register and explain the new API/example and distinguish participant-local from external authorization.

---

### Task 1: Add the explicit high-level participant-local branch

**Files:**
- Modify: `tests/unit/services/command-submission-pipeline.test.ts`
- Modify: `tests/unit/services/grpc-command-signing.test.ts`
- Modify: `src/services/commands/command-submission-pipeline.ts`
- Modify: `src/services/command/command-service-client.ts`

**Interfaces:**
- Consumes: existing `ITransport.submitCommandAsync(request, signer?, options?)` and configured `ICommandSigner | CommandSigners`.
- Produces: `CommandSubmissionPipeline.submitParticipantLocalAsync(request, options?)` and `CommandServiceClient.submitParticipantLocalAndWaitAsync(request, options?)`, both returning `Promise<SubmitCommandResponse>`.

- [ ] **Step 1: Write the failing pipeline test**

Add a test that names the regression it catches: forwarding the configured signer would make a participant-local call enter external signing. Exercise the real pipeline and capture only the transport boundary:

```ts
it("bypasses a configured signer for participant-local submissions", async () => {
    const signAsync = vi.fn(async () => {
        throw new Error("participant-local submission must not sign");
    });
    const submitCommandAsync = vi.fn(async () => ({
        commandId: "cmd-local",
        transactionId: "tx-local",
    }));
    const transport = {
        features: { supportsCommandSigning: true },
        submitCommandAsync,
    } as unknown as ITransport;
    const pipeline = new CommandSubmissionPipeline({
        transport,
        signer: { signAsync },
    });
    const request = new SubmitCommandsRequest({
        applicationId: "app-local",
        actAs: ["Alice"],
        commands: [
            new CreateCommand({
                templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                createArguments: new DamlRecord({ marker: "first" }),
            }),
            new CreateCommand({
                templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                createArguments: new DamlRecord({ marker: "second" }),
            }),
        ],
    });
    const options = new RequestOptions({ timeoutMs: 5_000 });

    const result = await pipeline.submitParticipantLocalAsync(request, options);

    expect(result).toMatchObject({ transactionId: "tx-local" });
    expect(signAsync).not.toHaveBeenCalled();
    expect(submitCommandAsync).toHaveBeenCalledWith(request, undefined, options);
    expect(request.commands.map(command =>
        (command as CreateCommand).createArguments.fields[0]?.value,
    )).toHaveLength(2);
});
```

Import `ITransport` from the source transport interface. Keep the batch-order assertion based on the literal request object rather than rebuilding it with production mapping helpers.

- [ ] **Step 2: Write the failing public gRPC routing test**

In `grpc-command-signing.test.ts`, construct the real `CommandServiceClient` and `GrpcTransport`. The plain operation returns a literal response; every interactive dependency and the configured signer throws:

```ts
it("submits a participant-local command without using its configured external signer", async () => {
    const signAsync = vi.fn(async () => {
        throw new Error("external signer must not be called");
    });
    const submitCommandAsync = vi.fn(async () => ({
        commandId: "cmd-local",
        transactionId: "tx-local",
    }));
    const prepareSubmissionAsync = vi.fn(async () => {
        throw new Error("interactive prepare must not be called");
    });
    const executeSubmissionAndWaitAsync = vi.fn(async () => {
        throw new Error("interactive execute must not be called");
    });
    const client = new CommandServiceClient(
        new GrpcTransport({
            getLedgerApiVersionAsync: async () => { throw new Error("not used"); },
            allocatePartyAsync: async () => { throw new Error("not used"); },
            listKnownPartiesAsync: async () => { throw new Error("not used"); },
            grantUserRightsAsync: async () => { throw new Error("not used"); },
            uploadDarFileAsync: async () => { throw new Error("not used"); },
            getActiveContractsPageAsync: async () => { throw new Error("not used"); },
            getActiveContractsAsync: async () => { throw new Error("not used"); },
            getUpdatesAsync: async () => { throw new Error("not used"); },
            submitCommandAsync,
            prepareSubmissionAsync,
            executeSubmissionAndWaitAsync,
        }),
        { signAsync },
    );
    const request = new SubmitCommandsRequest({
        applicationId: "app-local",
        actAs: ["Alice"],
        commands: [new CreateCommand({
            templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
            createArguments: new DamlRecord({ issuer: "Alice" }),
        })],
    });

    await expect(
        client.submitParticipantLocalAndWaitAsync(request),
    ).resolves.toMatchObject({ transactionId: "tx-local" });
    expect(submitCommandAsync).toHaveBeenCalledOnce();
    expect(signAsync).not.toHaveBeenCalled();
    expect(prepareSubmissionAsync).not.toHaveBeenCalled();
    expect(executeSubmissionAndWaitAsync).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
rtk proxy npx vitest run tests/unit/services/command-submission-pipeline.test.ts tests/unit/services/grpc-command-signing.test.ts
```

Expected: FAIL because `submitParticipantLocalAsync` and `submitParticipantLocalAndWaitAsync` do not exist. Fix test syntax or fixtures if needed, but do not add production code until both fail for the missing API.

- [ ] **Step 4: Implement the minimal pipeline and client methods**

Add to `CommandSubmissionPipeline`:

```ts
public submitParticipantLocalAsync(
    request: SubmitCommandsRequest,
    options?: RequestOptions,
): Promise<SubmitCommandResponse> {
    return this.dependencies.transport.submitCommandAsync(
        request,
        undefined,
        options,
    );
}
```

Add to `CommandServiceClient`:

```ts
/**
 * Submits through the connected participant without external command signing.
 * A configured command signer is deliberately ignored for this call.
 */
public submitParticipantLocalAndWaitAsync(
    request: SubmitCommandsRequest,
    options?: RequestOptions,
): Promise<SubmitCommandResponse> {
    return this.pipeline.submitParticipantLocalAsync(request, options);
}
```

Do not modify `ITransport`, `GrpcTransport`, `JsonTransport`, interactive mappers, or generated code.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```bash
rtk proxy npx vitest run tests/unit/services/command-submission-pipeline.test.ts tests/unit/services/grpc-command-signing.test.ts
rtk npm run build
rtk npm run lint
```

Expected: all focused tests, TypeScript build, and lint pass with no warning introduced by the new methods.

- [ ] **Step 6: Commit the core API**

```bash
rtk git add src/services/commands/command-submission-pipeline.ts src/services/command/command-service-client.ts tests/unit/services/command-submission-pipeline.test.ts tests/unit/services/grpc-command-signing.test.ts
rtk git commit -m "feat: add participant-local command submission path"
```

---

### Task 2: Add the standalone participant-local proof example and documentation

**Files:**
- Modify: `tests/unit/examples/localnet.test.ts`
- Modify: `examples/shared/localnet.ts`
- Create: `examples/98-participant-local-command-submission.ts`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `DOCUMENTATION.md`

**Interfaces:**
- Consumes: `CommandServiceClient.submitParticipantLocalAndWaitAsync`, existing DAR/party/ACS/deadline/compatibility helpers.
- Produces: `createExampleClient({ commandSigner })` and `npm run example:workflow:participant-local`.

- [ ] **Step 1: Write the failing example-options test**

Add `ICommandSigner` to the helper test imports only if needed for typing, then add:

```ts
it("preserves an injected command signer for authorization-route examples", () => {
    const commandSigner = {
        signAsync: vi.fn(async () => {
            throw new Error("not called while creating options");
        }),
    };

    const options = createExampleClientOptions({
        environment: environment(),
        commandSigner,
    });

    expect(options.commandSigner).toBe(commandSigner);
});
```

- [ ] **Step 2: Run the helper test and verify RED**

Run:

```bash
rtk proxy npx vitest run tests/unit/examples/localnet.test.ts
```

Expected: FAIL because `ExampleClientInit` does not accept `commandSigner` and the returned options do not preserve one.

- [ ] **Step 3: Implement signer injection in the example helper**

Import `ICommandSigner`, add `commandSigner?: ICommandSigner` to `ExampleClientInit`, and pass it to `CantonClientOptions`:

```ts
type ExampleClientInit = {
    environment?: NodeJS.ProcessEnv;
    tls?: boolean;
    requireBearerToken?: boolean;
    defaultTlsRootCertificatePath?: string;
    commandSigner?: ICommandSigner;
};

// inside new CantonClientOptions({...})
commandSigner: init.commandSigner,
```

- [ ] **Step 4: Run the helper test and verify GREEN**

Run:

```bash
rtk proxy npx vitest run tests/unit/examples/localnet.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add the standalone TypeScript example**

Create `examples/98-participant-local-command-submission.ts`. It must:

- use `runExampleAsync("participant-local-command-submission", ...)`;
- create a gRPC example client with `requireBearerToken: true` and a
  `commandSigner.signAsync` implementation that throws
  `"participant-local submission unexpectedly invoked the external signer"`;
- create one `OperationDeadline` from `exampleTimeoutMs()`;
- load/upload the existing application fixture and resolve/allocate the hosted actor;
- read and report `readWorkflowCompatibilityAsync`;
- create a unique text marker from random bytes;
- call only `client.commandService.submitParticipantLocalAndWaitAsync(...)` for the command;
- require a non-empty response transaction ID;
- traverse active-contract pages with `buildActiveContractsRequest` and
  `createExampleActiveContractsTraversalOptions`, selecting exactly one event
  whose `readCreatedMessageText(event)` equals the marker;
- fail if no exact active contract is found;
- print only participant version, release core, compatibility path, actor party,
  transaction ID, contract ID, and `Authorization route: participant-local`;
- warn that fallback party allocation, DAR upload, and the created contract are durable;
- always dispose the client in `finally`.

The example must not instantiate or call interactive submission messages, expose credentials, or catch signer failures as expected behavior. The command must succeed; that success is the proof that the signer was bypassed.

- [ ] **Step 6: Register and document the example and API**

Add to `package.json`:

```json
"example:workflow:participant-local": "npm run build && node --loader ts-node/esm examples/98-participant-local-command-submission.ts"
```

Update `README.md` examples commands and workflow notes with the new script, durable-state warning, normal `SDK_EXAMPLE_*` configuration, signer-bypass purpose, and unchanged 3.5.7/3.5.8 implementation.

Update `DOCUMENTATION.md`:

- add `commandService.submitParticipantLocalAndWaitAsync(request)` beside the existing command API;
- explain it uses ordinary participant submission and bypasses any configured signer;
- contrast it with signer-configured `submitAndWaitAsync`, which uses interactive external signing;
- add the method to the transport support table as JSON and gRPC supported, while noting that `commandSigner` itself remains gRPC-only.

- [ ] **Step 7: Verify example compilation, docs, and focused tests**

Run:

```bash
rtk npm run examples:check
rtk proxy npx vitest run tests/unit/examples/localnet.test.ts tests/unit/services/command-submission-pipeline.test.ts tests/unit/services/grpc-command-signing.test.ts
rtk npm run build
rtk npm run lint
```

Expected: all commands pass.

- [ ] **Step 8: Commit the example and documentation**

```bash
rtk git add examples/98-participant-local-command-submission.ts examples/shared/localnet.ts tests/unit/examples/localnet.test.ts package.json README.md DOCUMENTATION.md
rtk git commit -m "docs: add participant-local submission example"
```

---

### Task 3: Prove compatibility live and run final verification

**Files:**
- No planned source changes.
- Diagnostic evidence, if retained, must stay under the already ignored `.superpowers/sdd/2026-08-03-participant-local-interactive-submission/` directory and contain no credentials.

**Interfaces:**
- Consumes: `npm run example:workflow:participant-local`, authenticated Participant 3.5.7 on ports 3901/3902, and isolated Participant 3.5.8 on ports 8901/8902.
- Produces: final pass/fail evidence for one common implementation and a clean committed tree.

- [ ] **Step 1: Run the unchanged example against exact Participant 3.5.7**

Use a protected child shell and a temporary token file. Do not print the token:

```bash
rtk bash -lc '
proof_token_357="$(rtk mktemp)"
trap '\''rtk rm -f "$proof_token_357"'\'' EXIT
PARTICIPANT_358_LEDGER_TOKEN_FILE="$proof_token_357" rtk node node/participant-358-synchronizer.mjs mint-ledger-token
export SDK_EXAMPLE_LEDGER_ENDPOINT=localhost:3901
export SDK_EXAMPLE_LEDGER_ADMIN_ENDPOINT=localhost:3901
export SDK_EXAMPLE_PARTICIPANT_ADMIN_ENDPOINT=localhost:3902
export SDK_EXAMPLE_BEARER_TOKEN="$(rtk cat "$proof_token_357")"
export SDK_EXAMPLE_TIMEOUT_MS=60000
rtk npm run example:workflow:participant-local
'
```

Expected: output reports release core 3.5.7, common path, participant-local route, non-empty transaction/contract IDs, and no signer error.

- [ ] **Step 2: Run the same source against exact Participant 3.5.8**

Refresh the isolated sidecar environment inside a protected child shell:

```bash
rtk bash -lc '
eval "$(rtk bash node/start-local-participant-358.sh --refresh-token)"
export SDK_EXAMPLE_LEDGER_ENDPOINT=localhost:${PARTICIPANT_358_LEDGER_PORT:-8901}
export SDK_EXAMPLE_LEDGER_ADMIN_ENDPOINT=localhost:${PARTICIPANT_358_LEDGER_PORT:-8901}
export SDK_EXAMPLE_PARTICIPANT_ADMIN_ENDPOINT=localhost:${PARTICIPANT_358_ADMIN_PORT:-8902}
export SDK_EXAMPLE_TIMEOUT_MS=60000
rtk npm run example:workflow:participant-local
'
```

Expected: output reports release core 3.5.8 with the same common path and structural proof. Do not add a version branch if both pass unchanged.

- [ ] **Step 3: Run final verification from the committed tree**

Run:

```bash
rtk npm test
rtk npm run examples:check
rtk npm run build
rtk npm run lint
rtk npm pack --dry-run
rtk git status --short
```

Expected: the complete suite, example typecheck, build, lint, and package dry run pass; only intentional plan/spec edits remain if they have not yet been committed.

- [ ] **Step 4: Commit corrected design and plan artifacts**

```bash
rtk git add docs/superpowers/specs/2026-08-03-participant-local-interactive-submission-design.md docs/superpowers/plans/2026-08-03-participant-local-command-submission-implementation-plan.md
rtk git commit -m "docs: correct participant-local submission design"
```

- [ ] **Step 5: Verify final history and clean state**

Run:

```bash
rtk git status --short
rtk git log -4 --oneline
```

Expected: clean worktree and commits for the core API, example/docs, and corrected design/plan.
