# List Parties Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared `client.parties.listAsync(...)` SDK operation backed by JSON `GET /v2/parties` and gRPC `ListKnownParties`.

**Architecture:** Keep the public surface SDK-owned with `ListPartiesRequest`, `ListPartiesResponse`, and `PartyDetails`, then map those DTOs inside the JSON and gRPC transports. Extend the existing `ITransport` and `PartiesClient` boundary instead of creating transport-specific public party-listing APIs.

**Tech Stack:** TypeScript, Vitest, existing JSON transport abstractions, existing protobuf-ts generated Ledger API types

---

## File Structure

Implementation should touch this existing structure:

- `src/core/types/requests/list-parties-request.ts`
- `src/core/types/responses/list-parties-response.ts`
- `src/core/types/party-details.ts`
- `src/core/transports/transport.interface.ts`
- `src/services/parties/parties-client.ts`
- `src/client/service-registry.ts`
- `src/transports/json/mappers/parties-mapper.ts`
- `src/transports/json/json-transport.ts`
- `src/transports/grpc/mappers/parties-mapper.ts`
- `src/transports/grpc/grpc-transport.ts`
- `src/transports/grpc/grpc-channel-factory.ts`
- `tests/unit/types/list-parties-types.test.ts`
- `tests/unit/services/parties-client.test.ts`
- `tests/unit/json/json-operational-mappers.test.ts`
- `tests/unit/json/json-parties-client.test.ts`
- `tests/unit/grpc/grpc-operational-mappers.test.ts`
- `tests/unit/grpc/grpc-parties-client.test.ts`
- `tests/fixtures/fake-grpc-services.ts`
- `src/index.ts`

Do not reuse `src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/ListPartiesResponse`; that is a different API surface.

### Task 1: Add SDK List-Parties DTOs And Exports

**Files:**
- Create: `src/core/types/requests/list-parties-request.ts`
- Create: `src/core/types/responses/list-parties-response.ts`
- Create: `src/core/types/party-details.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/types/list-parties-types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { ListPartiesRequest, ListPartiesResponse, PartyDetails } from "../../../src";

describe("list parties sdk types", () => {
    it("stores request filters", () => {
        const request = new ListPartiesRequest({
            identityProviderId: "default",
            filterParty: "Alice",
            pageSize: 25,
            pageToken: "token-1",
        });

        expect(request.identityProviderId).toBe("default");
        expect(request.filterParty).toBe("Alice");
        expect(request.pageSize).toBe(25);
        expect(request.pageToken).toBe("token-1");
    });

    it("stores response party details", () => {
        const party = new PartyDetails({
            party: "Alice",
            isLocal: true,
            localMetadata: { region: "us" },
            identityProviderId: "default",
        });

        const response = new ListPartiesResponse({
            partyDetails: [party],
            nextPageToken: "next-1",
        });

        expect(response.partyDetails[0]).toBeInstanceOf(PartyDetails);
        expect(response.nextPageToken).toBe("next-1");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/types/list-parties-types.test.ts`
Expected: FAIL with missing exports or missing classes

- [ ] **Step 3: Write minimal implementation**

```ts
export class ListPartiesRequest {
    public readonly identityProviderId?: string;
    public readonly filterParty?: string;
    public readonly pageSize?: number;
    public readonly pageToken?: string;

    public constructor(
        init: {
            identityProviderId?: string;
            filterParty?: string;
            pageSize?: number;
            pageToken?: string;
        } = {},
    ) {
        this.identityProviderId = init.identityProviderId;
        this.filterParty = init.filterParty;
        this.pageSize = init.pageSize;
        this.pageToken = init.pageToken;
    }
}

export class PartyDetails {
    public readonly party: string;
    public readonly isLocal: boolean;
    public readonly localMetadata?: Record<string, string>;
    public readonly identityProviderId?: string;

    public constructor(init: {
        party: string;
        isLocal: boolean;
        localMetadata?: Record<string, string>;
        identityProviderId?: string;
    }) {
        this.party = init.party;
        this.isLocal = init.isLocal;
        this.localMetadata = init.localMetadata;
        this.identityProviderId = init.identityProviderId;
    }
}

export class ListPartiesResponse {
    public readonly partyDetails: PartyDetails[];
    public readonly nextPageToken?: string;

    public constructor(init: {
        partyDetails: PartyDetails[];
        nextPageToken?: string;
    }) {
        this.partyDetails = init.partyDetails;
        this.nextPageToken = init.nextPageToken;
    }
}
```

Export the three new SDK types from `src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/types/list-parties-types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/types/requests/list-parties-request.ts src/core/types/responses/list-parties-response.ts src/core/types/party-details.ts src/index.ts tests/unit/types/list-parties-types.test.ts
git commit -m "feat: add list parties sdk models"
```

### Task 2: Extend The Shared Service And Transport Boundary

**Files:**
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/services/parties/parties-client.ts`
- Modify: `src/client/service-registry.ts`
- Test: `tests/unit/services/parties-client.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { ListPartiesRequest, ListPartiesResponse, PartyDetails } from "../../../src";
import { PartiesClient } from "../../../src/services/parties/parties-client.js";

describe("PartiesClient", () => {
    it("lists parties through the selected transport", async () => {
        const transport = {
            features: { supportsCommandSigning: false },
            getHealthAsync: async () => {
                throw new Error("not used");
            },
            createPartyAsync: async () => {
                throw new Error("not used");
            },
            listPartiesAsync: async () =>
                new ListPartiesResponse({
                    partyDetails: [
                        new PartyDetails({
                            party: "Alice",
                            isLocal: true,
                        }),
                    ],
                }),
            grantUserRightsAsync: async () => {
                throw new Error("not used");
            },
            uploadPackageAsync: async () => {
                throw new Error("not used");
            },
            queryContractsAsync: async () => {
                throw new Error("not used");
            },
            streamTransactionsAsync: async () => {
                throw new Error("not used");
            },
            submitCommandAsync: async () => {
                throw new Error("not used");
            },
        };

        const client = new PartiesClient(transport);

        await expect(
            client.listAsync(new ListPartiesRequest({ filterParty: "Alice" })),
        ).resolves.toMatchObject({
            partyDetails: [{ party: "Alice" }],
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/services/parties-client.test.ts`
Expected: FAIL because `listAsync` and `listPartiesAsync` do not exist yet

- [ ] **Step 3: Write minimal implementation**

```ts
export interface ITransport {
    readonly features: TransportFeatures;
    getHealthAsync(): Promise<HealthStatusResponse>;
    createPartyAsync(request: CreatePartyRequest): Promise<CreatePartyResponse>;
    listPartiesAsync(
        request: ListPartiesRequest,
    ): Promise<ListPartiesResponse>;
    // existing methods...
}

export class PartiesClient {
    public constructor(private readonly transport: ITransport) {}

    public createAsync(
        request: CreatePartyRequest,
    ): Promise<CreatePartyResponse> {
        return this.transport.createPartyAsync(request);
    }

    public listAsync(
        request: ListPartiesRequest,
    ): Promise<ListPartiesResponse> {
        return this.transport.listPartiesAsync(request);
    }
}
```

Extend `PlaceholderTransport` in `src/client/service-registry.ts` with:

```ts
public async listPartiesAsync(
    _request: ListPartiesRequest,
): Promise<ListPartiesResponse> {
    throw new TransportError("party listing is not available yet");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/services/parties-client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/transports/transport.interface.ts src/services/parties/parties-client.ts src/client/service-registry.ts tests/unit/services/parties-client.test.ts
git commit -m "feat: extend shared parties service for list operations"
```

### Task 3: Implement JSON List-Parties Mapping And Transport Support

**Files:**
- Modify: `src/transports/json/mappers/parties-mapper.ts`
- Modify: `src/transports/json/json-transport.ts`
- Test: `tests/unit/json/json-operational-mappers.test.ts`
- Test: `tests/unit/json/json-parties-client.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { mapJsonListParties } from "../../../src/transports/json/mappers/parties-mapper.js";

describe("JSON operational mappers", () => {
    it("maps list parties payloads", () => {
        const result = mapJsonListParties({
            partyDetails: [
                {
                    party: "Alice",
                    isLocal: true,
                    localMetadata: { attributes: { region: "us" } },
                    identityProviderId: "default",
                },
            ],
            nextPageToken: "next-1",
        });

        expect(result.partyDetails[0]).toMatchObject({
            party: "Alice",
            isLocal: true,
            identityProviderId: "default",
        });
        expect(result.nextPageToken).toBe("next-1");
    });
});
```

```ts
import { describe, expect, it } from "vitest";
import { ListPartiesRequest } from "../../../src";
import { PartiesClient } from "../../../src/services/parties/parties-client.js";
import { JsonTransport } from "../../../src/transports/json/json-transport.js";

describe("PartiesClient with JSON transport", () => {
    it("calls /v2/parties with the shared query parameters", async () => {
        let requestedPath = "";

        const transport = new JsonTransport({
            getAsync: async (path: string) => {
                requestedPath = path;

                return {
                    partyDetails: [
                        {
                            party: "Alice",
                            isLocal: true,
                        },
                    ],
                    nextPageToken: "next-1",
                };
            },
            postAsync: async () => ({}),
        });

        const client = new PartiesClient(transport);

        const result = await client.listAsync(
            new ListPartiesRequest({
                identityProviderId: "default",
                filterParty: "Alice",
                pageSize: 25,
                pageToken: "token-1",
            }),
        );

        expect(requestedPath).toBe(
            "/v2/parties?identity-provider-id=default&filter-party=Alice&pageSize=25&pageToken=token-1",
        );
        expect(result.partyDetails[0].party).toBe("Alice");
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/json/json-operational-mappers.test.ts tests/unit/json/json-parties-client.test.ts`
Expected: FAIL with missing mapper or missing `listPartiesAsync`

- [ ] **Step 3: Write minimal implementation**

```ts
export function mapJsonListParties(payload: {
    partyDetails?: Array<{
        party?: string;
        isLocal?: boolean;
        localMetadata?: { attributes?: Record<string, string> };
        identityProviderId?: string;
    }>;
    nextPageToken?: string;
}): ListPartiesResponse {
    return new ListPartiesResponse({
        partyDetails: (payload.partyDetails ?? []).map(
            item =>
                new PartyDetails({
                    party: item.party ?? "",
                    isLocal: item.isLocal ?? false,
                    localMetadata: item.localMetadata?.attributes,
                    identityProviderId: item.identityProviderId,
                }),
        ),
        nextPageToken: payload.nextPageToken,
    });
}
```

Add to `JsonTransport`:

```ts
public async listPartiesAsync(
    request: ListPartiesRequest,
): Promise<ListPartiesResponse> {
    const query = new URLSearchParams();

    if (request.identityProviderId) {
        query.set("identity-provider-id", request.identityProviderId);
    }
    if (request.filterParty) {
        query.set("filter-party", request.filterParty);
    }
    if (request.pageSize !== undefined) {
        query.set("pageSize", request.pageSize.toString());
    }
    if (request.pageToken) {
        query.set("pageToken", request.pageToken);
    }

    const path =
        query.size === 0 ? "/v2/parties" : `/v2/parties?${query.toString()}`;

    const payload = await this.httpClient.getAsync(path);

    return mapJsonListParties(payload as {
        partyDetails?: unknown[];
        nextPageToken?: string;
    });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/json/json-operational-mappers.test.ts tests/unit/json/json-parties-client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/transports/json/mappers/parties-mapper.ts src/transports/json/json-transport.ts tests/unit/json/json-operational-mappers.test.ts tests/unit/json/json-parties-client.test.ts
git commit -m "feat: add json list parties support"
```

### Task 4: Implement gRPC List-Parties Mapping And Transport Support

**Files:**
- Modify: `src/transports/grpc/mappers/parties-mapper.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `tests/fixtures/fake-grpc-services.ts`
- Test: `tests/unit/grpc/grpc-operational-mappers.test.ts`
- Test: `tests/unit/grpc/grpc-parties-client.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
    mapGrpcListParties,
    mapGrpcListPartiesRequest,
} from "../../../src/transports/grpc/mappers/parties-mapper.js";
import { ListPartiesRequest } from "../../../src";

describe("gRPC operational mappers", () => {
    it("maps list parties requests", () => {
        const result = mapGrpcListPartiesRequest(
            new ListPartiesRequest({
                identityProviderId: "default",
                filterParty: "Alice",
                pageSize: 25,
                pageToken: "token-1",
            }),
        );

        expect(result).toMatchObject({
            identityProviderId: "default",
            filterParty: "Alice",
            pageSize: 25,
            pageToken: "token-1",
        });
    });

    it("maps list parties responses", () => {
        const result = mapGrpcListParties({
            partyDetails: [
                {
                    party: "Alice",
                    isLocal: true,
                    localMetadata: {
                        resourceVersion: "1",
                        annotations: { region: "us" },
                    },
                    identityProviderId: "default",
                },
            ],
            nextPageToken: "next-1",
        });

        expect(result.partyDetails[0]).toMatchObject({
            party: "Alice",
            isLocal: true,
            identityProviderId: "default",
        });
        expect(result.nextPageToken).toBe("next-1");
    });
});
```

```ts
import { describe, expect, it } from "vitest";
import { ListPartiesRequest } from "../../../src";
import { createFakeGrpcOperations } from "../../fixtures/fake-grpc-services.js";
import { PartiesClient } from "../../../src/services/parties/parties-client.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("PartiesClient with gRPC transport", () => {
    it("delegates listKnownParties through grpc operations", async () => {
        let capturedRequest: unknown;

        const transport = new GrpcTransport(
            createFakeGrpcOperations({
                listPartiesAsync: async request => {
                    capturedRequest = request;

                    return {
                        partyDetails: [{ party: "Alice", isLocal: true }],
                        nextPageToken: "next-1",
                    };
                },
            }),
        );

        const client = new PartiesClient(transport);

        const result = await client.listAsync(
            new ListPartiesRequest({ filterParty: "Alice" }),
        );

        expect(capturedRequest).toMatchObject({ filterParty: "Alice" });
        expect(result.partyDetails[0].party).toBe("Alice");
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/grpc/grpc-operational-mappers.test.ts tests/unit/grpc/grpc-parties-client.test.ts`
Expected: FAIL with missing request mapper, response mapper, or gRPC transport method

- [ ] **Step 3: Write minimal implementation**

Use the generated Ledger API types from:

- `src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.ts`

Add mapper functions:

```ts
export function mapGrpcListPartiesRequest(
    request: ListPartiesRequest,
): ListKnownPartiesRequest {
    return {
        identityProviderId: request.identityProviderId ?? "",
        pageToken: request.pageToken ?? "",
        pageSize: request.pageSize ?? 0,
        filterParty: request.filterParty ?? "",
    };
}

export function mapGrpcListParties(
    payload: ListKnownPartiesResponse,
): ListPartiesResponse {
    return new ListPartiesResponse({
        partyDetails: payload.partyDetails.map(
            item =>
                new PartyDetails({
                    party: item.party,
                    isLocal: item.isLocal,
                    localMetadata: item.localMetadata?.annotations,
                    identityProviderId: item.identityProviderId,
                }),
        ),
        nextPageToken: payload.nextPageToken || undefined,
    });
}
```

Extend `GrpcOperations` with:

```ts
listPartiesAsync(request: unknown): Promise<unknown>;
```

and add the stub implementation in `createGrpcOperations(...)`:

```ts
async listPartiesAsync(_request: unknown): Promise<unknown> {
    throw new TransportError("gRPC party operations are not wired yet");
}
```

Then add to `GrpcTransport`:

```ts
public async listPartiesAsync(
    request: ListPartiesRequest,
): Promise<ListPartiesResponse> {
    const payload = await this.operations.listPartiesAsync(
        mapGrpcListPartiesRequest(request),
    );

    return mapGrpcListParties(payload as ListKnownPartiesResponse);
}
```

Also extend `tests/fixtures/fake-grpc-services.ts` with a default `listPartiesAsync` implementation so existing transport construction helpers still satisfy `GrpcOperations`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/grpc/grpc-operational-mappers.test.ts tests/unit/grpc/grpc-parties-client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/transports/grpc/mappers/parties-mapper.ts src/transports/grpc/grpc-transport.ts src/transports/grpc/grpc-channel-factory.ts tests/fixtures/fake-grpc-services.ts tests/unit/grpc/grpc-operational-mappers.test.ts tests/unit/grpc/grpc-parties-client.test.ts
git commit -m "feat: add grpc list parties support"
```

### Task 5: Run End-To-End Verification For The New Shared Surface

**Files:**
- Modify: none
- Test: `tests/unit/types/list-parties-types.test.ts`
- Test: `tests/unit/services/parties-client.test.ts`
- Test: `tests/unit/json/json-operational-mappers.test.ts`
- Test: `tests/unit/json/json-parties-client.test.ts`
- Test: `tests/unit/grpc/grpc-operational-mappers.test.ts`
- Test: `tests/unit/grpc/grpc-parties-client.test.ts`

- [ ] **Step 1: Run the focused unit suite**

Run:

```bash
npm test -- tests/unit/types/list-parties-types.test.ts tests/unit/services/parties-client.test.ts tests/unit/json/json-operational-mappers.test.ts tests/unit/json/json-parties-client.test.ts tests/unit/grpc/grpc-operational-mappers.test.ts tests/unit/grpc/grpc-parties-client.test.ts
```

Expected: PASS

- [ ] **Step 2: Run the broader quality gates**

Run:

```bash
npm run build
npm run lint
```

Expected: both commands PASS

- [ ] **Step 3: Review the final diff**

Run:

```bash
git diff --stat HEAD~4..HEAD
git status --short
```

Expected: only the planned list-parties files are changed and the working tree is clean

- [ ] **Step 4: Create the final feature commit if needed**

If Task 5 required any fixups, commit them:

```bash
git add src tests
git commit -m "test: finalize list parties coverage"
```

If no fixups were needed, mark this step complete without creating an extra commit.

- [ ] **Step 5: Document verification results in the handoff**

Record:

- which test commands passed
- whether `build` passed
- whether `lint` passed
- whether gRPC channel wiring is still stubbed in `grpc-channel-factory.ts`
