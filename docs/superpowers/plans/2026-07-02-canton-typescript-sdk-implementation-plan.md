# Canton TypeScript SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a greenfield Canton TypeScript SDK with a shared high-level client, `grpc` and `json` transport adapters, and `grpc`-only external signing for command submission.

**Architecture:** The SDK exposes SDK-owned DTOs and service objects through a root `CantonClient`, with shared workflow services delegating into transport adapters. `grpc` and `json` implementations stay behind internal interfaces except where protocol-specific clients are explicitly exported for features that do not overlap cleanly.

**Tech Stack:** TypeScript, Node.js, Vitest, gRPC transport library (`@grpc/grpc-js`), JSON/HTTP transport via `fetch`, subpath exports via `package.json`

---

## File Structure

Implementation should target this initial structure:

- `package.json`
- `tsconfig.json`
- `vitest.config.ts`
- `README.md`
- `src/index.ts`
- `src/client/cantonClient.ts`
- `src/client/cantonClientOptions.ts`
- `src/client/serviceRegistry.ts`
- `src/core/types/*.ts`
- `src/core/errors/*.ts`
- `src/core/auth/*.ts`
- `src/core/signing/*.ts`
- `src/core/transports/*.ts`
- `src/services/commands/*.ts`
- `src/services/contracts/*.ts`
- `src/services/events/*.ts`
- `src/services/parties/*.ts`
- `src/services/users/*.ts`
- `src/services/packages/*.ts`
- `src/services/system/*.ts`
- `src/transports/json/**/*.ts`
- `src/transports/grpc/**/*.ts`
- `tests/unit/**/*.test.ts`
- `tests/contract/**/*.test.ts`
- `tests/integration/**/*.test.ts`
- `tests/fixtures/**/*.ts`

The file structure is part of the design. Do not collapse the SDK into a handful of large files.

### Task 1: Bootstrap The Library Workspace

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `README.md`
- Create: `src/index.ts`
- Test: `tests/unit/smoke/packageShape.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { CantonClient, CantonClientOptions, TransportKind } from "../../../src";

describe("package surface", () => {
  it("exports the root client types", () => {
    expect(CantonClient).toBeTypeOf("function");
    expect(CantonClientOptions).toBeTypeOf("function");
    expect(TransportKind.grpc).toBe("grpc");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/smoke/packageShape.test.ts`
Expected: FAIL with module resolution or missing export errors

- [ ] **Step 3: Write minimal implementation**

```ts
export enum TransportKind {
  grpc = "grpc",
  json = "json",
}

export class CantonClientOptions {}
export class CantonClient {}
```

Also create a minimal `package.json` with:

- `type: "module"`
- `main`, `types`, and `exports`
- scripts for `build`, `test`, and `test:unit`
- dev dependencies for `typescript` and `vitest`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/smoke/packageShape.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts README.md src/index.ts tests/unit/smoke/packageShape.test.ts
git commit -m "chore: bootstrap canton typescript sdk workspace"
```

### Task 2: Add Core Options, Enums, And Error Types

**Files:**
- Create: `src/client/cantonClientOptions.ts`
- Create: `src/core/types/transportKind.ts`
- Create: `src/core/types/submissionMode.ts`
- Create: `src/core/types/eventStreamKind.ts`
- Create: `src/core/types/userRightKind.ts`
- Create: `src/core/types/packageFormat.ts`
- Create: `src/core/errors/cantonError.ts`
- Create: `src/core/errors/validationError.ts`
- Create: `src/core/errors/authenticationError.ts`
- Create: `src/core/errors/authorizationError.ts`
- Create: `src/core/errors/transportError.ts`
- Create: `src/core/errors/signingError.ts`
- Create: `src/core/errors/timeoutError.ts`
- Create: `src/core/errors/conflictError.ts`
- Create: `src/core/errors/notSupportedError.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/core/cantonClientOptions.test.ts`
- Test: `tests/unit/core/errorHierarchy.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("stores transport and endpoint settings", () => {
  const options = new CantonClientOptions({
    transportKind: TransportKind.grpc,
    endpoint: "https://participant.example.com",
  });

  expect(options.transportKind).toBe(TransportKind.grpc);
  expect(options.endpoint).toBe("https://participant.example.com");
});

it("keeps sdk errors in a single hierarchy", () => {
  const error = new NotSupportedError("json signing is not supported");
  expect(error).toBeInstanceOf(CantonError);
  expect(error.name).toBe("NotSupportedError");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/core/cantonClientOptions.test.ts tests/unit/core/errorHierarchy.test.ts`
Expected: FAIL with missing classes, enums, or properties

- [ ] **Step 3: Write minimal implementation**

```ts
export class CantonClientOptions {
  public readonly transportKind: TransportKind;
  public readonly endpoint: string;

  public constructor(init: { transportKind: TransportKind; endpoint: string }) {
    this.transportKind = init.transportKind;
    this.endpoint = init.endpoint;
  }
}

export class CantonError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
```

Add thin subclasses for each error type and export the enums from `src/index.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/core/cantonClientOptions.test.ts tests/unit/core/errorHierarchy.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/cantonClientOptions.ts src/core/types src/core/errors src/index.ts tests/unit/core/cantonClientOptions.test.ts tests/unit/core/errorHierarchy.test.ts
git commit -m "feat: add core options enums and error types"
```

### Task 3: Add Auth, Signing, And Transport Abstractions

**Files:**
- Create: `src/core/auth/iAuthProvider.ts`
- Create: `src/core/auth/bearerTokenAuthProvider.ts`
- Create: `src/core/signing/iCommandSigner.ts`
- Create: `src/core/signing/signCommandRequest.ts`
- Create: `src/core/signing/signCommandResult.ts`
- Create: `src/core/transports/iTransport.ts`
- Create: `src/core/transports/transportFeatures.ts`
- Create: `src/core/transports/transportCapability.ts`
- Modify: `src/client/cantonClientOptions.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/auth/bearerTokenAuthProvider.test.ts`
- Test: `tests/unit/signing/signCommandContracts.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("returns a bearer token header", async () => {
  const provider = new BearerTokenAuthProvider("token-123");
  await expect(provider.getHeadersAsync()).resolves.toEqual({
    authorization: "Bearer token-123",
  });
});

it("defines a stable sdk signing contract", async () => {
  const signer: ICommandSigner = {
    signAsync: async request => ({
      algorithm: "ed25519",
      signature: new Uint8Array([1, 2, 3]),
      keyId: request.keyId,
    }),
  };

  const result = await signer.signAsync(
    new SignCommandRequest({
      payload: new Uint8Array([9, 9]),
      keyId: "key-1",
    }),
  );

  expect(result.algorithm).toBe("ed25519");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/auth/bearerTokenAuthProvider.test.ts tests/unit/signing/signCommandContracts.test.ts`
Expected: FAIL with missing interfaces or DTOs

- [ ] **Step 3: Write minimal implementation**

```ts
export interface IAuthProvider {
  getHeadersAsync(): Promise<Record<string, string>>;
}

export class BearerTokenAuthProvider implements IAuthProvider {
  public constructor(private readonly token: string) {}

  public async getHeadersAsync(): Promise<Record<string, string>> {
    return { authorization: `Bearer ${this.token}` };
  }
}
```

Define `ICommandSigner`, `SignCommandRequest`, `SignCommandResult`, and a transport capability model that can declare whether signing is supported.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/auth/bearerTokenAuthProvider.test.ts tests/unit/signing/signCommandContracts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/auth src/core/signing src/core/transports src/client/cantonClientOptions.ts src/index.ts tests/unit/auth/bearerTokenAuthProvider.test.ts tests/unit/signing/signCommandContracts.test.ts
git commit -m "feat: add auth signing and transport abstractions"
```

### Task 4: Build Client Construction And Service Registry

**Files:**
- Create: `src/client/cantonClient.ts`
- Create: `src/client/serviceRegistry.ts`
- Create: `src/services/commands/commandsClient.ts`
- Create: `src/services/contracts/contractsClient.ts`
- Create: `src/services/events/eventsClient.ts`
- Create: `src/services/parties/partiesClient.ts`
- Create: `src/services/users/usersClient.ts`
- Create: `src/services/packages/packagesClient.ts`
- Create: `src/services/system/systemClient.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/client/cantonClientConstruction.test.ts`
- Test: `tests/unit/client/notSupportedSigning.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("creates shared service objects", () => {
  const client = new CantonClient(
    new CantonClientOptions({
      transportKind: TransportKind.json,
      endpoint: "https://participant.example.com",
    }),
  );

  expect(client.commands).toBeDefined();
  expect(client.contracts).toBeDefined();
  expect(client.system).toBeDefined();
});

it("rejects json command signing in v1", () => {
  expect(
    () =>
      new CantonClient(
        new CantonClientOptions({
          transportKind: TransportKind.json,
          endpoint: "https://participant.example.com",
          commandSigner: { signAsync: async () => ({ algorithm: "x", signature: new Uint8Array() }) },
        }),
      ),
  ).toThrow(NotSupportedError);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/client/cantonClientConstruction.test.ts tests/unit/client/notSupportedSigning.test.ts`
Expected: FAIL with missing client or unsupported capability checks

- [ ] **Step 3: Write minimal implementation**

```ts
export class CantonClient {
  public readonly commands: CommandsClient;
  public readonly contracts: ContractsClient;
  public readonly events: EventsClient;
  public readonly parties: PartiesClient;
  public readonly users: UsersClient;
  public readonly packages: PackagesClient;
  public readonly system: SystemClient;

  public constructor(private readonly options: CantonClientOptions) {
    if (options.transportKind === TransportKind.json && options.commandSigner) {
      throw new NotSupportedError("commandSigner is only supported with grpc transport");
    }

    const services = createServiceRegistry(options);
    this.commands = services.commands;
    this.contracts = services.contracts;
    this.events = services.events;
    this.parties = services.parties;
    this.users = services.users;
    this.packages = services.packages;
    this.system = services.system;
  }
}
```

Use placeholder service implementations that delegate to transport contracts to keep the constructor testable before transport details exist.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/client/cantonClientConstruction.test.ts tests/unit/client/notSupportedSigning.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client src/services src/index.ts tests/unit/client/cantonClientConstruction.test.ts tests/unit/client/notSupportedSigning.test.ts
git commit -m "feat: add root client and service registry"
```

### Task 5: Implement Shared DTOs For Operational And Ledger Workflows

**Files:**
- Create: `src/core/types/requests/submitCommandRequest.ts`
- Create: `src/core/types/responses/submitCommandResponse.ts`
- Create: `src/core/types/requests/queryContractsRequest.ts`
- Create: `src/core/types/responses/queryContractsResponse.ts`
- Create: `src/core/types/requests/streamTransactionsRequest.ts`
- Create: `src/core/types/requests/createPartyRequest.ts`
- Create: `src/core/types/responses/createPartyResponse.ts`
- Create: `src/core/types/requests/grantUserRightsRequest.ts`
- Create: `src/core/types/responses/grantUserRightsResponse.ts`
- Create: `src/core/types/requests/uploadPackageRequest.ts`
- Create: `src/core/types/responses/uploadPackageResponse.ts`
- Create: `src/core/types/responses/healthStatusResponse.ts`
- Test: `tests/unit/types/requestValidation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("rejects a submit request without an acting party", () => {
  expect(
    () =>
      new SubmitCommandRequest({
        applicationId: "app-1",
        actAs: [],
      }),
  ).toThrow(ValidationError);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/types/requestValidation.test.ts`
Expected: FAIL with missing DTOs

- [ ] **Step 3: Write minimal implementation**

```ts
export class SubmitCommandRequest {
  public readonly applicationId: string;
  public readonly actAs: readonly string[];

  public constructor(init: { applicationId: string; actAs: readonly string[] }) {
    if (init.actAs.length === 0) {
      throw new ValidationError("submit requests require at least one actAs party");
    }

    this.applicationId = init.applicationId;
    this.actAs = init.actAs;
  }
}
```

Repeat the same DTO pattern for the shared service contracts needed by the spec. Keep DTO files small and focused.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/types/requestValidation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/types tests/unit/types/requestValidation.test.ts
git commit -m "feat: add shared sdk request and response types"
```

### Task 6: Implement The JSON Transport And Shared Operational Services

**Files:**
- Create: `src/transports/json/jsonTransport.ts`
- Create: `src/transports/json/jsonTransportFactory.ts`
- Create: `src/transports/json/jsonHttpClient.ts`
- Create: `src/transports/json/mappers/systemMapper.ts`
- Create: `src/transports/json/mappers/partiesMapper.ts`
- Create: `src/transports/json/mappers/usersMapper.ts`
- Create: `src/transports/json/mappers/packagesMapper.ts`
- Modify: `src/services/system/systemClient.ts`
- Modify: `src/services/parties/partiesClient.ts`
- Modify: `src/services/users/usersClient.ts`
- Modify: `src/services/packages/packagesClient.ts`
- Test: `tests/unit/json/jsonSystemClient.test.ts`
- Test: `tests/unit/json/jsonOperationalMappers.test.ts`
- Test: `tests/contract/shared/operationalServices.json.contract.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("maps json health responses into sdk types", async () => {
  const transport = createFakeJsonTransport({
    getHealthAsync: async () => ({ status: "healthy", version: "1.0.0" }),
  });

  const client = new SystemClient(transport);
  await expect(client.getHealthAsync()).resolves.toMatchObject({ status: "healthy" });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/json/jsonSystemClient.test.ts tests/unit/json/jsonOperationalMappers.test.ts tests/contract/shared/operationalServices.json.contract.test.ts`
Expected: FAIL with missing transport implementation or mapper logic

- [ ] **Step 3: Write minimal implementation**

```ts
export class JsonTransport implements ITransport {
  public readonly features = {
    supportsCommandSigning: false,
  };

  public async getHealthAsync(): Promise<HealthStatusResponse> {
    const payload = await this.httpClient.getAsync("/livez");
    return mapJsonHealth(payload);
  }
}
```

Implement enough JSON transport operations to support:

- health/status
- party create/list
- user create/list/grant/revoke
- package upload/list

Use injected HTTP clients so mapper tests stay fast and deterministic.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/json/jsonSystemClient.test.ts tests/unit/json/jsonOperationalMappers.test.ts tests/contract/shared/operationalServices.json.contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/transports/json src/services/system/systemClient.ts src/services/parties/partiesClient.ts src/services/users/usersClient.ts src/services/packages/packagesClient.ts tests/unit/json tests/contract/shared/operationalServices.json.contract.test.ts
git commit -m "feat: implement json transport for shared operational services"
```

### Task 7: Implement The gRPC Transport And Shared Operational Services

**Files:**
- Create: `src/transports/grpc/grpcTransport.ts`
- Create: `src/transports/grpc/grpcTransportFactory.ts`
- Create: `src/transports/grpc/grpcChannelFactory.ts`
- Create: `src/transports/grpc/mappers/systemMapper.ts`
- Create: `src/transports/grpc/mappers/partiesMapper.ts`
- Create: `src/transports/grpc/mappers/usersMapper.ts`
- Create: `src/transports/grpc/mappers/packagesMapper.ts`
- Create: `src/transports/grpc/generated/README.md`
- Modify: `src/client/serviceRegistry.ts`
- Test: `tests/unit/grpc/grpcSystemClient.test.ts`
- Test: `tests/unit/grpc/grpcOperationalMappers.test.ts`
- Test: `tests/contract/shared/operationalServices.grpc.contract.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("reports grpc signing capability", () => {
  const transport = createFakeGrpcTransport();
  expect(transport.features.supportsCommandSigning).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/grpc/grpcSystemClient.test.ts tests/unit/grpc/grpcOperationalMappers.test.ts tests/contract/shared/operationalServices.grpc.contract.test.ts`
Expected: FAIL with missing gRPC transport or contract coverage

- [ ] **Step 3: Write minimal implementation**

```ts
export class GrpcTransport implements ITransport {
  public readonly features = {
    supportsCommandSigning: true,
  };
}
```

Then add actual gRPC-backed operational methods and ensure the shared service interfaces behave the same as the JSON implementation for overlapping workflows.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/grpc/grpcSystemClient.test.ts tests/unit/grpc/grpcOperationalMappers.test.ts tests/contract/shared/operationalServices.grpc.contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/transports/grpc src/client/serviceRegistry.ts tests/unit/grpc tests/contract/shared/operationalServices.grpc.contract.test.ts
git commit -m "feat: implement grpc transport for shared operational services"
```

### Task 8: Implement Shared Ledger Query And Event Services

**Files:**
- Modify: `src/services/contracts/contractsClient.ts`
- Modify: `src/services/events/eventsClient.ts`
- Create: `src/transports/json/mappers/contractsMapper.ts`
- Create: `src/transports/json/mappers/eventsMapper.ts`
- Create: `src/transports/grpc/mappers/contractsMapper.ts`
- Create: `src/transports/grpc/mappers/eventsMapper.ts`
- Test: `tests/unit/services/contractsClient.test.ts`
- Test: `tests/unit/services/eventsClient.test.ts`
- Test: `tests/contract/shared/ledgerReadServices.contract.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("queries contracts through the selected transport", async () => {
  const transport = createLedgerReadTransportDouble({
    queryContractsAsync: async () => new QueryContractsResponse({ contracts: [] }),
  });

  const client = new ContractsClient(transport);
  await expect(client.queryAsync(new QueryContractsRequest({ templateId: "Main:Iou" }))).resolves.toBeInstanceOf(QueryContractsResponse);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/services/contractsClient.test.ts tests/unit/services/eventsClient.test.ts tests/contract/shared/ledgerReadServices.contract.test.ts`
Expected: FAIL with missing ledger read methods or DTO mappings

- [ ] **Step 3: Write minimal implementation**

```ts
export class ContractsClient {
  public constructor(private readonly transport: ITransport) {}

  public queryAsync(request: QueryContractsRequest): Promise<QueryContractsResponse> {
    return this.transport.queryContractsAsync(request);
  }
}
```

Implement read/query/event stream support for both transports where the functionality overlaps. Keep protocol-specific differences behind the transport boundary.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/services/contractsClient.test.ts tests/unit/services/eventsClient.test.ts tests/contract/shared/ledgerReadServices.contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/contracts/contractsClient.ts src/services/events/eventsClient.ts src/transports/json/mappers/contractsMapper.ts src/transports/json/mappers/eventsMapper.ts src/transports/grpc/mappers/contractsMapper.ts src/transports/grpc/mappers/eventsMapper.ts tests/unit/services/contractsClient.test.ts tests/unit/services/eventsClient.test.ts tests/contract/shared/ledgerReadServices.contract.test.ts
git commit -m "feat: add shared ledger query and event services"
```

### Task 9: Implement Command Submission And gRPC External Signing

**Files:**
- Modify: `src/services/commands/commandsClient.ts`
- Create: `src/services/commands/commandSubmissionPipeline.ts`
- Create: `src/services/commands/commandPayloadBuilder.ts`
- Create: `src/transports/grpc/mappers/commandsMapper.ts`
- Create: `src/transports/json/mappers/commandsMapper.ts`
- Test: `tests/unit/services/commandSubmissionPipeline.test.ts`
- Test: `tests/unit/services/grpcCommandSigning.test.ts`
- Test: `tests/unit/services/jsonCommandSigningNotSupported.test.ts`
- Test: `tests/contract/shared/commandSubmission.grpc.contract.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("passes canonical command payloads to the signer before grpc submission", async () => {
  const signAsync = vi.fn(async () => new SignCommandResult({
    algorithm: "ed25519",
    signature: new Uint8Array([1, 2, 3]),
  }));

  const pipeline = new CommandSubmissionPipeline({
    transport: createGrpcCommandTransportDouble(),
    signer: { signAsync },
  });

  await pipeline.submitAsync(
    new SubmitCommandRequest({
      applicationId: "app-1",
      actAs: ["Alice"],
    }),
  );

  expect(signAsync).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/services/commandSubmissionPipeline.test.ts tests/unit/services/grpcCommandSigning.test.ts tests/unit/services/jsonCommandSigningNotSupported.test.ts tests/contract/shared/commandSubmission.grpc.contract.test.ts`
Expected: FAIL with missing pipeline or signing integration

- [ ] **Step 3: Write minimal implementation**

```ts
export class CommandSubmissionPipeline {
  public constructor(
    private readonly dependencies: {
      transport: ITransport;
      signer?: ICommandSigner;
    },
  ) {}

  public async submitAsync(request: SubmitCommandRequest): Promise<SubmitCommandResponse> {
    const payload = buildCanonicalCommandPayload(request);

    const signed = this.dependencies.signer
      ? await this.dependencies.signer.signAsync(new SignCommandRequest({ payload }))
      : undefined;

    return this.dependencies.transport.submitCommandAsync(request, signed);
  }
}
```

Add the JSON-side guard as part of the transport capability checks and ensure the gRPC path can consume signed command metadata cleanly.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/services/commandSubmissionPipeline.test.ts tests/unit/services/grpcCommandSigning.test.ts tests/unit/services/jsonCommandSigningNotSupported.test.ts tests/contract/shared/commandSubmission.grpc.contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/commands src/transports/grpc/mappers/commandsMapper.ts src/transports/json/mappers/commandsMapper.ts tests/unit/services/commandSubmissionPipeline.test.ts tests/unit/services/grpcCommandSigning.test.ts tests/unit/services/jsonCommandSigningNotSupported.test.ts tests/contract/shared/commandSubmission.grpc.contract.test.ts
git commit -m "feat: add grpc command submission with external signing"
```

### Task 10: Add Protocol-Specific Exports, Integration Fixtures, And Docs

**Files:**
- Modify: `package.json`
- Modify: `src/index.ts`
- Create: `src/grpc/index.ts`
- Create: `src/json/index.ts`
- Create: `tests/fixtures/fakeJsonServer.ts`
- Create: `tests/fixtures/fakeGrpcServices.ts`
- Create: `tests/integration/json/jsonTransport.integration.test.ts`
- Create: `tests/integration/grpc/grpcTransport.integration.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Write the failing tests**

```ts
it("exports protocol-specific entrypoints", async () => {
  const grpcModule = await import("../../../src/grpc/index.js");
  const jsonModule = await import("../../../src/json/index.js");

  expect(grpcModule).toHaveProperty("GrpcLedgerClient");
  expect(jsonModule).toHaveProperty("JsonLedgerClient");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/integration/json/jsonTransport.integration.test.ts tests/integration/grpc/grpcTransport.integration.test.ts`
Expected: FAIL with missing protocol-specific entrypoints or fixture wiring

- [ ] **Step 3: Write minimal implementation**

```ts
export { GrpcLedgerClient } from "../transports/grpc/grpcLedgerClient.js";
export { JsonLedgerClient } from "../transports/json/jsonLedgerClient.js";
```

Also update `README.md` with:

- shared client example
- `grpc` external signing example
- `json` unsupported-signing note
- high-level description of service groups and transport-specific modules

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json src/index.ts src/grpc/index.ts src/json/index.ts tests/fixtures tests/integration README.md
git commit -m "feat: add protocol exports integration fixtures and docs"
```

## Verification Checklist

Before declaring the implementation complete, run:

- `npm test`
- `npm run build`

Expected:

- all Vitest suites pass
- TypeScript build succeeds with no type errors

## Notes For The Implementer

- Keep public API members in `camelCase` even when the structure feels C#-style.
- Do not introduce static utility exports for core workflows.
- Use enums only where the value set is genuinely closed and stable.
- Treat `commandSigner` as `grpc`-only in v1. Do not weaken this constraint.
- Prefer small mapper files over broad transport classes that mix request building, IO, and response translation.
- If generated gRPC code is needed, isolate it under `src/transports/grpc/generated/` and keep handwritten adapters outside that folder.

## Review Constraint

This plan was written in a session where subagent delegation was not explicitly requested, so the usual plan-review subagent loop has not been run here. If delegation is allowed during execution, run the documented review workflow before implementation begins.
