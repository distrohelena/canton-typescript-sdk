# gRPC Interface Exercise Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match PQS metadata and relation semantics for LF interfaces and inherited exercised events.

**Architecture:** Decode LF2 interfaces locally in the gRPC package reader from the same raw archive used for existing template metadata, then normalize both payload types into canonical type rows with PQS-exact aliases. Map exercise choice identity through `interfaceId ?? templateId`, while preserving concrete template identity for contract and package edges and loading every referenced type package.

**Tech Stack:** TypeScript, generated DAML-LF2 protobufs, Vitest, ESLint, npm ESM/CJS build

---

### Task 1: Materialize LF interface metadata

**Files:**
- Modify: `tests/fixtures/daml-lf/sample-lf-package-fixture.ts`
- Modify: `tests/unit/query/grpc-package-relation-reader.test.ts`
- Modify: `src/query/grpc/grpc-package-relation-reader.ts`

- [ ] **Step 1: Add failing reader coverage**

Extend the sample LF2 archive with an unobserved `EventLog` interface and a
non-consuming `EventLog_HoldingsChange` choice. Update the reader assertion so
the template and interface have exact PQS aliases:

```ts
aliases: [
    "sample-package:Sample.Module:Iou",
    "Sample.Module:Iou",
    "Iou",
]
```

```ts
expect.objectContaining({
    moduleName: "Sample.Module",
    entityName: "EventLog",
    payloadType: "interface",
    aliases: [
        "sample-package:Sample.Module:EventLog",
        "Sample.Module:EventLog",
        "EventLog",
    ],
    choices: [expect.objectContaining({
        choice: "EventLog_HoldingsChange",
        consuming: false,
        aliases: [
            "sample-package:Sample.Module:EventLog:EventLog_HoldingsChange",
            "Sample.Module:EventLog:EventLog_HoldingsChange",
            "EventLog:EventLog_HoldingsChange",
            "EventLog_HoldingsChange",
        ],
    })],
})
```

- [ ] **Step 2: Verify RED**

Run: `rtk npm run test -- tests/unit/query/grpc-package-relation-reader.test.ts`

Expected: FAIL because aliases have only one entry and no interface metadata is emitted.

- [ ] **Step 3: Implement raw interface decoding**

Decode once with `loadRawPackageOrThrow`, map existing semantic templates with
`Lf2ModelMapper.mapPackage`, and resolve each raw module/interface/choice name
with bounds-checked reader-local interned string/dotted-name helpers. Change
`GrpcPackageTemplateMetadata.payloadType` to `"template" | "interface"` and use
shared alias builders for both payload types.

- [ ] **Step 4: Verify GREEN**

Run: `rtk npm run test -- tests/unit/query/grpc-package-relation-reader.test.ts`

Expected: PASS.

### Task 2: Normalize exact aliases and expose unobserved interfaces

**Files:**
- Modify: `tests/unit/query/grpc-relation-mapper.test.ts`
- Modify: `tests/unit/query/grpc-query-client.test.ts`
- Modify: `src/query/grpc/grpc-relation-mapper.ts`

- [ ] **Step 1: Add failing canonical/root coverage**

Update the mapper metadata fixture to use the three contract aliases and four
choice aliases. Add an interface metadata fixture and assert an empty dataset
contains its `contractTypes` and `exerciseTypes` rows. Update the Package
Service root-query test to assert `contractTypes.findMany()` returns both the
unobserved `EventLog` interface and `Iou` template, and `exerciseTypes.findMany()`
returns both choices.

- [ ] **Step 2: Verify RED**

Run: `rtk npm run test -- tests/unit/query/grpc-relation-mapper.test.ts tests/unit/query/grpc-query-client.test.ts`

Expected: FAIL because normalization accepts only `payloadType: "template"`
and one alias per row.

- [ ] **Step 3: Implement canonical metadata parity**

Allow exactly `template` or `interface`. Replace single-alias validation with
ordered exact-array validation against:

```ts
[`${packageName}:${moduleName}:${entityName}`, `${moduleName}:${entityName}`, entityName]
```

and:

```ts
[
    `${packageName}:${moduleName}:${entityName}:${choiceName}`,
    `${moduleName}:${entityName}:${choiceName}`,
    `${entityName}:${choiceName}`,
    choiceName,
]
```

- [ ] **Step 4: Verify GREEN**

Run: `rtk npm run test -- tests/unit/query/grpc-relation-mapper.test.ts tests/unit/query/grpc-query-client.test.ts`

Expected: PASS.

### Task 3: Map inherited exercises through their interface owner

**Files:**
- Modify: `tests/unit/query/grpc-relation-mapper.test.ts`
- Modify: `src/query/grpc/grpc-relation-mapper.ts`

- [ ] **Step 1: Add the failing inherited-event regression**

Create a target whose creation and representative packages differ, then
exercise a non-consuming choice with a third concrete template package and
`interfaceId` in a fourth package. Assert:

- the exercise type identity uses the interface;
- the contract type identity and `contractTpePk` use the concrete target;
- `packagePk` links to `pkg-template`;
- referenced IDs contain the representative, concrete exercised-template, and
  interface packages but exclude creation-only provenance;
- the completed dataset links `exerciseType` to the interface row,
  `contractType` to the template row, and `package` to the template package.

- [ ] **Step 2: Verify RED**

Run: `rtk npm run test -- tests/unit/query/grpc-relation-mapper.test.ts`

Expected: FAIL because the exercise identity currently uses `templateId` and
the interface package is absent from references.

- [ ] **Step 3: Implement inherited identity semantics**

Add an `exerciseOwner` helper returning a validated
`event.interfaceId ?? event.templateId`. Use it in exercise identity registry
entries and type identity rows only. Keep row `contractTpePk` and `packagePk`
based on the validated concrete template. Include both concrete and interface
package IDs for exercised events, and make `referencedGrpcPackageIds` include
representative creation packages, concrete exercise package identities, and
choice-bearing type identity packages.

- [ ] **Step 4: Verify GREEN**

Run: `rtk npm run test -- tests/unit/query/grpc-relation-mapper.test.ts`

Expected: PASS.

### Task 4: Verify and commit

**Files:**
- Verify all files changed above
- Add: `docs/superpowers/plans/2026-08-03-grpc-interface-exercise-parity-implementation-plan.md`

- [ ] **Step 1: Run focused LF/package tests**

Run: `rtk npm run test -- tests/unit/query/grpc-package-relation-reader.test.ts tests/unit/query/grpc-relation-mapper.test.ts tests/unit/query/grpc-query-client.test.ts tests/unit/daml-lf tests/unit/grpc/grpc-package-services.test.ts`

Expected: PASS.

- [ ] **Step 2: Run full query tests**

Run: `rtk npm run test -- tests/unit/query`

Expected: PASS.

- [ ] **Step 3: Run lint and build**

Run: `rtk npx eslint src/query/grpc/grpc-package-relation-reader.ts src/query/grpc/grpc-relation-mapper.ts tests/fixtures/daml-lf/sample-lf-package-fixture.ts tests/unit/query/grpc-package-relation-reader.test.ts tests/unit/query/grpc-relation-mapper.test.ts tests/unit/query/grpc-query-client.test.ts`

Expected: no issues.

Run: `rtk npm run build`

Expected: ESM and CJS builds succeed.

- [ ] **Step 4: Review and commit**

Run: `rtk git diff --check && rtk git status --short`

Expected: only the scoped reader, mapper, fixture, tests, and this plan.

```bash
rtk git add src/query/grpc/grpc-package-relation-reader.ts src/query/grpc/grpc-relation-mapper.ts tests/fixtures/daml-lf/sample-lf-package-fixture.ts tests/unit/query/grpc-package-relation-reader.test.ts tests/unit/query/grpc-relation-mapper.test.ts tests/unit/query/grpc-query-client.test.ts docs/superpowers/plans/2026-08-03-grpc-interface-exercise-parity-implementation-plan.md
rtk git commit -m "fix: map inherited interface exercises"
```
