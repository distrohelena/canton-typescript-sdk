# README Product Positioning Redesign

## Status

Approved direction for a full structural rewrite of `README.md`.

## Goal

Make the package immediately understandable and attractive to both TypeScript
application developers and Canton operators without removing the repository's
existing technical detail.

The rewritten README should answer, in its first screenful:

1. What is this package?
2. Why would a Canton team use it?
3. What can it do for application developers and operators?
4. How quickly can a developer install it and perform a useful operation?

The tone is polished and technical: confident, benefit-led, and concrete,
without unsupported maturity claims or marketing hyperbole.

## Audience

The opening serves two audiences equally:

- TypeScript developers building Canton applications, commands, contract
  queries, streams, and party-aware workflows.
- Canton operators and integrators managing parties, packages, topology,
  authenticated connections, participant services, and local environments.

The README should present these as one coherent SDK rather than two unrelated
toolkits.

## Core Positioning

Lead with the promise:

> Build and operate Canton applications from TypeScript.

The supporting copy should describe one typed SDK spanning Ledger, Ledger
Admin, and Participant Admin APIs, with application commands and queries next
to operational party, topology, package, authentication, and localnet
capabilities.

The opening should emphasize four concrete differentiators:

1. **Seamless typed queries.** Application query code uses one public contract
   query surface while configuration selects gRPC or PQS.
2. **Application and operator workflows together.** A shared client covers
   command submission, state and update reads, parties, packages, users,
   topology, and participant operations.
3. **Complete party lifecycle support.** Hosted, externally signed Ed25519,
   and decentralized parties have focused SDK flows and runnable examples.
4. **Production-oriented foundations.** Typed errors, deadlines, pagination,
   authentication, TLS, external signing, and reproducible localnet tooling are
   visible first-class capabilities.

The invariant-testing, DAML-LF, replay-debugger, and interface-generator
surfaces remain valuable, but appear later as advanced or experimental
tooling rather than defining the package in the opening paragraph.

## Query-Parity Accuracy Gate

Another implementation is adding the same typed contract-query operations for
gRPC and PQS behind `QuerySource`. The README rewrite must inspect the final
landed API before editing and use its exact names, configuration, filters,
return types, and documented limitations.

The opening may advertise seamless gRPC/PQS query selection only when the
implementation and tests are present in the working tree. It must not infer
shipped behavior solely from the query-parity design or implementation plan.

If that work has not landed when the README rewrite begins, structure the
query section and capability summary for the feature but retain the currently
implemented capability wording. Do not publish future behavior as current.

## Information Architecture

The README should be reorganized in this order.

### 1. Product opening

- Package title.
- One-line product promise.
- A compact two- or three-sentence value proposition.
- Four scannable differentiators.
- No unsupported badges, adoption claims, or production-readiness label.

### 2. Install and quick start

- Keep the npm installation command near the top.
- Add one compact, useful TypeScript program using the actual final public API.
- Prefer a query or query-plus-command flow that demonstrates the shared
  `CantonManager`/client value without requiring a long setup block.
- Keep required configuration visible and avoid placeholder APIs.

### 3. Capability overview

Add a concise table organized by user outcome rather than protocol inventory.
Suggested categories:

| Category | Outcomes to show |
| --- | --- |
| Application development | typed queries, atomic command batches, ACS and update reads, contract lifecycle |
| Parties and identity | hosted, external Ed25519, decentralized parties, users and rights |
| Canton operations | packages, topology, participant status, pruning and repair-related surfaces |
| Connectivity and security | gRPC and JSON, PQS, bearer authentication, TLS, typed gRPC errors and deadlines |
| Developer tooling | localnet launchers, examples, invariant testing, DAML-LF, generated interfaces, replay debugging |

Use short descriptions and links to the deeper README sections. Do not turn the
table into a duplicate of the detailed service map.

### 4. Seamless contract queries

- Show that business query code stays the same while initialization selects
  gRPC or PQS.
- Prefer one query snippet and two small configuration snippets, or one
  configuration diff.
- Explain the common supported contract-query subset first.
- Put source-specific extensions and capability errors after the common path.
- Preserve security guidance for PQS read-only roles and raw SQL.

### 5. Commands and application workflows

- Explain plural `SubmitCommandsRequest` atomic semantics.
- Distinguish participant-local submission from externally signed interactive
  submission.
- Link to the workflow examples instead of repeating all of their details in
  the opening half.

### 6. Parties and topology

- Present hosted, external, and decentralized party flows as a clear set.
- Preserve the 3.5.7/3.5.8 compatibility evidence and topology caveats.
- Keep detailed signing/key-shape notes close to their relevant examples.

### 7. Examples and local development

- Keep runnable command lists.
- Keep localnet, optional TLS, ES256, and 3.5.8 sidecar instructions.
- Consolidate repeated environment-variable and durability warnings where
  possible without losing exact behavior.

### 8. Advanced and experimental tooling

- Experimental invariant testing.
- DAML-LF parser.
- Replay debugger.
- DAML interface generator.

Each should receive a compact explanation and linkable heading. Existing code
examples and limitations remain available.

### 9. Detailed reference

- Shared client construction.
- Error handling and protocol-specific clients.
- Detailed service map and transport support.
- External signing reference.
- Compatibility, packaging, and remaining low-level notes.

## Writing and Visual Style

- Use short paragraphs and descriptive headings.
- Prefer outcome-oriented language over internal implementation vocabulary in
  the first half.
- Use compact tables only where they improve scanning.
- Use code examples as proof, not decoration.
- Keep emoji out of technical headings and avoid a badge wall.
- Use bold sparingly for capability names and important distinctions.
- Avoid repeated claims such as “standalone proof,” “normal SDK_EXAMPLE
  configuration,” and the same compatibility statement in adjacent sections;
  consolidate them into shared introductory text and retain exceptions where
  they matter.
- Preserve exact commands, environment variable names, participant versions,
  and warnings.

## Content Preservation

The structural rewrite must not silently delete:

- installation and package import information;
- every runnable example command;
- localnet startup, sidecar, TLS, and ES256 instructions;
- durable-state and credential-safety warnings;
- Participant 3.5.7 and 3.5.8 live evidence;
- command atomicity and participant-local/external-signing distinctions;
- party topology and key-shape constraints;
- service and transport support details;
- invariant-testing safety constraints;
- DAML-LF, debugger, interface-generator, and external-signing guidance;
- PQS raw-SQL and read-only-role guidance;
- package/DAR provenance where currently documented.

Repetition may be consolidated. Content may move to more appropriate headings.
Any claim that becomes obsolete because of the query-parity implementation
must be updated rather than preserved verbatim.

## Verification

The implementation should verify:

1. all internal README anchors and referenced npm scripts are valid;
2. every command in `package.json` that the README names still exists;
3. the quick-start and query snippets type-check against the final public API
   or are covered by the repository's existing source-contract tests;
4. source-contract tests that intentionally assert README wording are updated
   to assert behaviorally meaningful facts rather than fragile marketing copy
   where practical;
5. `npm run examples:check`, focused README/example tests, and
   `npm pack --dry-run` pass;
6. the README remains included in the npm package while repository-only
   examples remain excluded;
7. no secrets, real bearer tokens, or unsafe credential-copy instructions are
   introduced.

## Non-Goals

This work does not:

- change SDK runtime behavior or public APIs;
- implement query parity itself;
- add a documentation website or generated API reference;
- add promotional badges, benchmarks, customer claims, or a maturity label;
- remove advanced/experimental features;
- rewrite `DOCUMENTATION.md` except where an exact cross-reference must remain
  consistent;
- change example behavior, localnet configuration, or compatibility policy.

## Success Criteria

The redesign is complete when:

1. a new reader can understand the package's value and primary capabilities in
   the opening screenful;
2. application developers and Canton operators can each identify useful
   workflows in the capability overview;
3. the final landed gRPC/PQS query behavior is demonstrated accurately with a
   configuration-only source choice;
4. installation and a useful first program appear before advanced tooling;
5. all existing technical guidance remains discoverable under a clearer
   hierarchy with materially less repetition;
6. documentation/source-contract/package verification passes;
7. only documentation and documentation-focused tests change.
