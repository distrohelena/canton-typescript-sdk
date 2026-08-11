# Template Generation Without External Package Validation Design

> **Superseded:** The generator now emits every modeled named data type. This
> document records the earlier lazy-reachability design and is retained for
> historical context only.

## Goal

Generate bindings from a Dalf or DAR while keeping general semantic consumers
strict. The generator-specific compilation factory may index packages without
global validation, but analyzer output is now rooted at every modeled data
type, not only at template fields and choices.

## Problem

The generator must not infer the future roots of the TypeScript application
from the template materialization code it emits. Pruning named declarations
based on template reachability makes otherwise valid package types unavailable
to consumers and can hide unresolved structured dependencies until a type is
used in generated bindings.

## Design

Keep the template-generation compilation factory that builds compilation
indexes without global reference validation. `DamlInterfaceGenerator` uses
this factory for both Dalf and DAR generation, while `DamlInterfaceAnalyzer`
enumerates every modeled `DamlLfDataType` and builds each as an analysis root.

The ordinary `DamlLfCompilation.createOrThrow` path remains strict for general
semantic/evaluator consumers. Any modeled data type with a missing structured
dependency now fails generation with its fully qualified package, module, and
type identity instead of being silently omitted. Value definitions are still
not generator output roots.
`ContractId<T>` remains its existing special case: its target is never resolved
because the generated value is a string.

DAR generation continues to load all Dalf entries and emits all their modeled
named types and templates. The factory still avoids validating unrelated value
definitions globally, but a structured reference in any emitted data type is
required to resolve.

## Verification

Add fixtures proving that an unused local named type is emitted and that an
unused named type directly referencing `Splice.Api.Token.HoldingV1.Holding`
still fails generation when no Holding package is present. Cover the equivalent
DAR generation path and verify template materialization remains successful
when extra local types are present.

Add separate Dalf and DAR negative tests where a template field or choice
directly uses the missing structured Holding type. Generation must reject with
the fully qualified external identity. This proves the generator does not make
TypeScript-usage assumptions based on template reachability.
