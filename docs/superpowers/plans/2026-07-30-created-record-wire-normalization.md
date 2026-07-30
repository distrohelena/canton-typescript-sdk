# Created Record-Wire Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize JSON-serialized ts-proto Record create payloads as materializable protobuf values.

**Architecture:** Detect only a strict ts-proto Record JSON shape at created payload aliases, parse it with `Value.fromJson({ record })`, then reuse immutable protobuf value normalization. Ordinary JSON payloads remain unchanged.

**Tech Stack:** TypeScript, protobuf-ts, Vitest.

---

### Task 1: Recognize and convert strict record-wire payloads

**Files:**
- Modify: `src/daml-interface/runtime/daml-event-source-normalizer.ts`
- Test: `tests/unit/daml-interface/daml-event-source-normalizer.test.ts`
- Test: `tests/integration/daml-interface/generated-template-materialization.integration.test.ts`

- [ ] **Step 1: Add failing normalization/materialization tests**

Cover `createArguments`, `create_arguments`, and `payload` with `{ fields: [{ label: "owner", value: { text: "Alice" } }] }`; assert protobuf record/value canonical oneofs, frozen values, and a nested list or optional containing `{ text: ... }`. Explicitly assert empty fields is protobuf. Cover non-array fields, missing/non-string labels, malformed/non-object/multi-variant values, and ordinary JSON objects with a fields property falling back to JSON. Add generated `Iou.fromCreatedEvent()` integration coverage that materializes typed fields from this third path.

- [ ] **Step 2: Verify red**

Run: `npm test -- tests/unit/daml-interface/daml-event-source-normalizer.test.ts`

Expected: FAIL because wire records are currently normalized as JSON.

- [ ] **Step 3: Implement narrowly**

Add a strict recursive record-wire predicate. It accepts every Ledger `Value` JSON oneof supported by `Value.fromJson`: scalar values, contract IDs, timestamps/dates/numerics, party/text, unit/bool, list, optional, textMap entries, genMap key/value entries, record, variant, enum, and the relevant identifier shapes (`recordId`, `variantId`, `enumId`). Validate scalar payload types and every recursive edge (`list.elements`, `optional.value`, `textMap.entries[].value`, `genMap.entries[].key/value`, `record.fields[].value`, `variant.value`) before parsing. In created normalization, parse matching payloads with `Value.fromJson({ record: payload })` before freeze/clone. Do not change generated protobuf or ordinary JSON paths.

- [ ] **Step 4: Verify and commit**

Run focused test, scoped ESLint, `npm run build`, and `git diff --check`.

Commit: `fix: normalize JSON record-wire created payloads`.
