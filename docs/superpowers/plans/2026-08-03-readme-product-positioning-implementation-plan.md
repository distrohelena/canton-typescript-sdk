# README Product Positioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `README.md` into a polished product-led guide for both TypeScript application developers and Canton operators while preserving the package's complete technical reference and accurately demonstrating the final gRPC/PQS query-parity API.

**Architecture:** Treat the README as two layers: a concise product and onboarding layer followed by reorganized deep technical guides and reference. Add a focused documentation-contract test for structural navigation, npm-script validity, anchors, security wording, and query-source positioning; retain the existing example/source tests for exact workflow behavior and package safety.

**Tech Stack:** GitHub-flavored Markdown, TypeScript/Vitest documentation contracts, existing `CantonManager`/`QuerySource` public API, npm package verification, repository example typechecking.

## Global Constraints

- Work directly on `main`; preserve unrelated changes and the other agent's query-parity plan/work.
- Use `apply_patch` for edits and prefix shell commands with `rtk`.
- Invoke Vitest only as `rtk proxy npx vitest`.
- The tone is polished and technical: confident, benefit-led, and concrete, without unsupported maturity claims or marketing hyperbole.
- Serve TypeScript application developers and Canton operators equally.
- Lead with “Build and operate Canton applications from TypeScript.”
- Do not advertise seamless gRPC/PQS query parity until its runtime implementation, tests, and final public API are present in the tree.
- Once query parity has landed, use its exact final names, configuration, common subset, cache behavior, pruning behavior, source-local key caveat, and PQS-only `$queryRaw` boundary.
- Preserve every runnable example command, exact environment variable, credential-safety warning, durable-state warning, 3.5.7/3.5.8 compatibility claim, party/key constraint, service-support fact, and DAR provenance fact.
- Repetition may be consolidated, but technical content must remain discoverable.
- Do not add badges, benchmarks, customer/adoption claims, emoji headings, or a production-readiness/maturity label.
- Do not change SDK runtime behavior, public APIs, examples, localnet configuration, `DOCUMENTATION.md`, or generated files.
- Only `README.md` and documentation-focused tests may change during implementation.

## Dependency Gate: query parity must land first

Before Task 1, inspect the final tree rather than the untracked query plan alone:

```bash
rtk git status --short
rtk git log -12 --oneline
rtk rg -n "class GrpcQueryClient|QuerySnapshotIncompleteError|cacheContracts|QuerySource\.grpc|QuerySource\.pqs" src tests README.md
```

Proceed only when the query-parity implementation and its tests are committed,
the query agent has finished editing `README.md`, and the worktree contains no
unrelated in-progress README change. If query parity has not landed, do not
write future behavior into the README and do not take ownership of the other
agent's untracked plan. Wait for that work to finish.

Record the implementation commit range and inspect these final contracts before
writing copy:

- `src/query/query-client.ts`
- `src/query/canton-manager.ts`
- `src/query/canton-manager-options.ts`
- final gRPC query client/data provider/cache types;
- query parity unit/live tests;
- the query-parity README fragment committed by the other work.

---

## File Structure

- `README.md` — one product-led document with onboarding, capabilities, guides,
  local development, advanced tooling, and detailed reference.
- `tests/unit/docs/readme-product-positioning.test.ts` — focused structural and
  safety contract for headings, local anchors, npm scripts, package positioning,
  and final query-source documentation.
- `tests/unit/examples/application-example-sources.test.ts` — existing exact
  workflow/source contracts, updated only where the new hierarchy or
  consolidation changes how README sections are located.

No new production or example file is created.

---

### Task 1: Build the product opening, navigation, and quick start

**Files:**
- Create: `tests/unit/docs/readme-product-positioning.test.ts`
- Modify: `README.md:1-79` and add the new opening sections before the existing deep guides

**Interfaces:**
- Consumes: final committed `CantonManager`, `QuerySource`, `CantonClientOptions`, `TransportKind`, and typed contract-query API.
- Produces: stable README top-level headings and a product/quick-start layer that Task 2 uses as the document skeleton.

- [ ] **Step 1: Write a failing structural README contract**

Create `tests/unit/docs/readme-product-positioning.test.ts` with helpers that
read `README.md` and `package.json`, extract H2 headings, generate GitHub-style
heading slugs, collect local Markdown links, and collect `npm run <script>`
references.

Add this first behavioral test:

```ts
it("leads with product value, onboarding, and the shared query surface", () => {
    const readme = readFileSync(readmePath, "utf8");
    const headings = extractH2Headings(readme);

    expect(readme.indexOf("Build and operate Canton applications from TypeScript."))
        .toBeGreaterThanOrEqual(0);
    expect(headings.slice(0, 6)).toEqual([
        "Install",
        "Quick start",
        "What you can build",
        "Seamless contract queries",
        "Commands and workflows",
        "Parties and topology",
    ]);
    expect(readme.indexOf("## Quick start"))
        .toBeLessThan(readme.indexOf("## Advanced and experimental tooling"));
});
```

Add independent tests that:

```ts
it("references only real npm scripts", () => {
    const scripts = readPackageScripts();

    for (const script of extractNpmRunScripts(readReadme())) {
        expect(scripts, `README references missing npm script '${script}'`)
            .toHaveProperty(script);
    }
});

it("has no broken local heading links", () => {
    const readme = readReadme();
    const slugs = new Set(extractHeadingSlugs(readme));

    for (const anchor of extractLocalAnchors(readme)) {
        expect(slugs, `README local link '#${anchor}' has no heading`)
            .toContain(anchor);
    }
});
```

Add positioning checks for both audiences and query parity without asserting
fragile prose:

```ts
expect(readme).toMatch(/Application development[\s\S]*Canton operations/);
expect(readme).toContain("QuerySource.grpc");
expect(readme).toContain("QuerySource.pqs");
expect(readme).toMatch(/same (?:typed )?query/i);
expect(readme).toContain("$queryRaw");
expect(readme).not.toMatch(/production[- ]ready|battle[- ]tested|enterprise[- ]grade/i);
```

Use a deterministic slugger that lowercases headings, removes Markdown
punctuation, converts whitespace to hyphens, collapses repeated hyphens, and
adds `-1`, `-2`, and so on for duplicate headings. This prevents a false pass
when two headings share the same text.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
rtk proxy npx vitest run tests/unit/docs/readme-product-positioning.test.ts
```

Expected: FAIL because the README does not contain the approved opening or
top-level section order. Fix only test implementation errors before editing
the README.

- [ ] **Step 3: Replace the opening with the approved product story**

Rewrite the beginning of `README.md` to this hierarchy and intent:

```md
# Canton TypeScript SDK

Build and operate Canton applications from TypeScript.

[Two short sentences describing one typed SDK across Ledger, Ledger Admin,
Participant Admin, and typed contract queries.]

- **Query without coupling business code to infrastructure.** ...
- **Build application and operator workflows with one client.** ...
- **Manage every supported party lifecycle.** ...
- **Connect securely and fail predictably.** ...

## Install

## Quick start

## What you can build

## Seamless contract queries

## Commands and workflows

## Parties and topology
```

Write the bracketed copy completely; do not leave bracket markers in the
document. Keep the opening before advanced/experimental content and keep each
introductory paragraph under five lines in the source.

The quick start must use only final public APIs. Configure both gRPC and PQS,
select one source through `querySource`, and keep the query function unchanged:

```ts
async function findMessages(manager: CantonManager) {
    return manager.query.contracts.findMany({
        where: {
            templateId: { equals: "package-id:Main:Message" },
            active: true,
        },
        take: 25,
    });
}
```

Use the exact final constructor/options shape from the landed query-parity code.
If both `grpc` and `pqs` options may coexist, show both once and make
`querySource` the only changed selector. If the landed API differs, follow the
code/tests rather than this illustrative initializer.

Add a compact capability table with these linked rows:

```md
| Area | What the SDK gives you |
| --- | --- |
| Application development | Typed contract queries, atomic commands, ACS/update reads, and lifecycle workflows |
| Parties and identity | Hosted, external Ed25519, and decentralized parties; users and rights |
| Canton operations | Packages, topology, participant status, pruning context, and repair/admin services |
| Connectivity and security | gRPC, JSON, PQS, bearer auth, TLS, deadlines, and typed gRPC errors |
| Developer tooling | Localnet launchers, runnable examples, invariant testing, DAML-LF, generated interfaces, and replay debugging |
```

Each row must contain at least one local link to the corresponding deeper
section that Task 2 retains.

- [ ] **Step 4: Document the common query path accurately**

In `## Seamless contract queries`:

- lead with the common typed operations proven by the landed query-parity
  implementation;
- show one `runQuery(manager)` function used by managers configured with
  `QuerySource.grpc` and `QuerySource.pqs`;
- state that source selection happens at initialization;
- describe participant visibility and source-local `pk`/`ix` portability;
- show the exact final `cacheContracts`/invalidation/TTL names and semantics;
- state that incomplete pruned history rejects with the exact final exported
  error type;
- state that `$queryRaw` remains PQS-only and requires a read-only PostgreSQL
  role.

Do not claim literal equality for PQS-local and gRPC-local keys. Do not describe
query operations that the final parity tests do not cover.

- [ ] **Step 5: Run the focused test and type/package checks and verify GREEN**

Run:

```bash
rtk proxy npx vitest run tests/unit/docs/readme-product-positioning.test.ts
rtk npm run build
rtk npm run verify:pack
rtk git diff --check
```

Expected: PASS. If the quick-start snippet exposes an incorrect API name, fix
the README against the final declaration files and query tests; do not change
production code.

- [ ] **Step 6: Commit the product opening**

```bash
rtk git add README.md tests/unit/docs/readme-product-positioning.test.ts
rtk git commit -m "docs: lead README with SDK capabilities"
```

---

### Task 2: Reorganize and consolidate the complete technical guide

**Files:**
- Modify: `README.md`
- Modify: `tests/unit/docs/readme-product-positioning.test.ts`
- Modify: `tests/unit/examples/application-example-sources.test.ts`

**Interfaces:**
- Consumes: Task 1's headings, anchors, quick start, and final query-parity wording; every existing README section and source-contract assertion.
- Produces: the final full README hierarchy with all prior technical content discoverable and reduced repetition.

- [ ] **Step 1: Extend the README contract with the final hierarchy and preservation checks**

Before moving the remaining content, extend the focused test so its expected H2
sequence is exactly:

```ts
expect(extractH2Headings(readme)).toEqual([
    "Install",
    "Quick start",
    "What you can build",
    "Seamless contract queries",
    "Commands and workflows",
    "Parties and topology",
    "Shared client, security, and errors",
    "Examples and local development",
    "Advanced and experimental tooling",
    "Detailed service reference",
]);
```

Nested H3 headings must retain linkable topics for:

```ts
expect(extractAllHeadingTitles(readme)).toEqual(expect.arrayContaining([
    "Atomic command batches",
    "Participant-local and external authorization",
    "Hosted parties",
    "External Ed25519 parties",
    "Decentralized parties",
    "Standalone TypeScript examples",
    "Workflow examples",
    "Localnet launchers",
    "Canton 3.5.8 sidecar",
    "Bearer authentication",
    "TLS",
    "Invariant testing",
    "DAML-LF parser",
    "Replay debugger",
    "DAML interface generator",
    "Service map",
    "Protocol-specific clients",
    "External signing reference",
]));
```

Add preservation checks based on categories, not full prose snapshots:

- all `example:*`, `example:workflow:*`, start/stop, and validation commands
  presently documented remain referenced;
- all `SDK_EXAMPLE_*` variables presently documented remain present;
- `3.5.7`, `3.5.8`, `PartyToParticipant`, `PartyToKeyMapping`, `multi_hash`,
  `OperationDeadline`, `ActiveContractsTraversalError`, and the exact DAR hash
  remain present;
- credential safety prohibits token values, `eval(`, `--refresh-token`, and
  unsafe token-file copy instructions;
- README remains listed in `package.json.files`, while `examples` remains
  excluded.

Compute the expected command and environment-variable sets as literal arrays in
the test. Do not derive expected values by parsing the pre-rewrite README.

- [ ] **Step 2: Run the documentation and existing source-contract tests and verify RED**

Run:

```bash
rtk proxy npx vitest run tests/unit/docs/readme-product-positioning.test.ts tests/unit/examples/application-example-sources.test.ts
```

Expected: the final hierarchy test fails while the existing workflow tests may
still pass against their old paragraph markers. Do not weaken safety or
workflow assertions merely to move content.

- [ ] **Step 3: Rebuild the full README under the final hierarchy**

Move and consolidate all remaining content under these responsibilities:

1. `Commands and workflows` — plural atomic batches, participant-local versus
   external authorization, state/update reads, and short links to examples.
2. `Parties and topology` — hosted, external Ed25519, decentralized flows,
   topology/key shapes, version evidence, and external-party convenience API.
3. `Shared client, security, and errors` — client construction, endpoint
   configuration, auth, TLS, deadlines, pagination, disposal, and normalized
   gRPC errors.
4. `Examples and local development` — all runnable commands, shared
   environment/durability/credential policy, focused workflow descriptions,
   localnet launchers, 3.5.8 sidecar, ES256, and TLS setup.
5. `Advanced and experimental tooling` — invariant testing first, then DAML-LF,
   replay debugger, and interface generation, each retaining code and safety
   constraints.
6. `Detailed service reference` — service map, protocol-specific clients,
   source-specific limitations, external signing details, and remaining
   packaging/provenance notes.

Remove the empty `## Service Map`/`## Canton Manager queries` adjacency. The
common query guide belongs near the top; source-specific service facts belong
in detailed reference.

Consolidate repeated workflow text into one shared paragraph for endpoints,
authentication, party selection, timeout, durable state, version reporting,
and compatibility policy. Keep a shorter per-workflow paragraph only for its
unique proof, required extra variable, mutation/read-only behavior, or caveat.

Do not use `<details>` to hide security warnings, unsupported operations, or
compatibility limits. Tables are allowed for capability/service comparisons;
keep commands and code in fenced blocks.

- [ ] **Step 4: Update existing README source-contract lookups without weakening behavior**

In `tests/unit/examples/application-example-sources.test.ts`, introduce a
heading-based helper:

```ts
function readReadmeSection(readme: string, heading: string): string {
    const marker = `### ${heading}`;
    const start = readme.indexOf(marker);

    if (start < 0) {
        throw new Error(`Expected README section '${heading}'.`);
    }

    const nextHeading = readme.indexOf("\n### ", start + marker.length);

    return readme.slice(start, nextHeading < 0 ? undefined : nextHeading);
}
```

Use this helper for workflow sections that no longer begin with their old exact
sentence. Retain assertions for scripts, variables, auth/user behavior,
durability, structured failure classification, version evidence, and service
support. Replace exact marketing/count phrases such as “The eight stateful
workflow examples are standalone proofs” with structural checks for the
`Workflow examples` section and literal script inventory.

Keep `readServiceMapEntry` working by locating the nested `### Service map`
heading instead of requiring `## Service Map`. Preserve every method-support
assertion.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
rtk proxy npx vitest run tests/unit/docs/readme-product-positioning.test.ts tests/unit/examples/application-example-sources.test.ts tests/unit/package/npm-pack-verification-script.test.ts tests/unit/public/submit-commands-public-surface.test.ts
rtk npm run examples:check
rtk npm run verify:pack
rtk proxy npx eslint tests/unit/docs/readme-product-positioning.test.ts tests/unit/examples/application-example-sources.test.ts --max-warnings=0
rtk git diff --check
```

Expected: PASS. The focused README test must report no missing scripts, broken
anchors, unsafe credential instructions, or lost preservation terms.

- [ ] **Step 6: Commit the complete reorganization**

```bash
rtk git add README.md tests/unit/docs/readme-product-positioning.test.ts tests/unit/examples/application-example-sources.test.ts
rtk git commit -m "docs: reorganize README guides and reference"
```

---

### Task 3: Final content audit and package verification

**Files:**
- Modify only if verification finds a documentation/test defect: `README.md`, `tests/unit/docs/readme-product-positioning.test.ts`, `tests/unit/examples/application-example-sources.test.ts`

**Interfaces:**
- Consumes: final README and all package/example/query verification surfaces.
- Produces: a clean, committed, package-safe documentation change with evidence that query claims match the final implementation.

- [ ] **Step 1: Audit claims against the final source**

Run these read-only comparisons:

```bash
rtk rg -n "QuerySource\.(grpc|pqs)|cacheContracts|QuerySnapshotIncompleteError|\$queryRaw" README.md src/query tests/unit/query tests/live/specs
rtk rg -n "production-ready|battle-tested|enterprise-grade|coming soon|planned" README.md
rtk rg -n "npm run |SDK_EXAMPLE_|Participant 3\.5\.[78]|PartyToParticipant|PartyToKeyMapping|multi_hash" README.md
```

Expected: every query name/claim is supported by final code/tests; unsupported
marketing terms return no matches; operational commands and compatibility
facts remain present.

- [ ] **Step 2: Run the full final verification serially**

Ensure no other build/test process owns `dist`, then run:

```bash
rtk proxy npm test
rtk proxy npm run examples:check
rtk npm run verify:pack
rtk npm pack --dry-run
rtk proxy npx eslint tests/unit/docs/readme-product-positioning.test.ts tests/unit/examples/application-example-sources.test.ts --max-warnings=0
rtk git diff --check
rtk git status --short
```

Wait for the real `npm test` process and its final Vitest summary before
starting `examples:check`; the repository's generated-project tests share the
root `dist` tree with builds.

Expected: tests, example typechecking/build, pack verification, package dry
run, scoped lint, and diff check pass. Status contains only intentional
README/test changes if a final fix was required.

- [ ] **Step 3: Commit any verification-driven correction**

If Step 2 required a real README/test correction, commit only that correction:

```bash
rtk git add README.md tests/unit/docs/readme-product-positioning.test.ts tests/unit/examples/application-example-sources.test.ts
rtk git commit -m "docs: finalize README product guide"
```

If no file changed, do not create an empty commit.

- [ ] **Step 4: Verify final history and clean state**

```bash
rtk git status --short
rtk git log -6 --oneline
```

Expected: clean worktree and one or two focused README commits, plus an optional
verification-fix commit only when needed. The query-parity commits remain
separate and untouched.
