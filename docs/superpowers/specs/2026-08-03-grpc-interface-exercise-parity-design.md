# gRPC Interface Exercise Parity Design

## Problem

An inherited exercised event identifies two different types. Its `templateId`
describes the concrete target template, while `interfaceId` describes the owner
of the inherited choice. The gRPC relation mapper currently uses `templateId`
for both identities, so it cannot resolve the exercise type that PQS records
under the interface. The package metadata reader also emits templates only,
which means the interface type does not exist in root type queries or relation
links.

The gRPC aliases also differ from PQS. Contract types require
`package:module:entity`, `module:entity`, and `entity`; exercise types require
those three qualified forms plus the bare choice.

## Design

Keep the public query API unchanged and extend only internal package metadata
to represent both `template` and `interface` payload types. Continue using the
existing semantic LF model for templates, and use
`DamlLfPackageLoader.loadRawPackageOrThrow` plus local, bounds-checked interned
name resolution for LF2 `Module.interfaces`. This avoids expanding the general
semantic model while ensuring every installed interface is available to root
`contractTypes` and `exerciseTypes` queries, even if no event observes it.

Generate PQS-exact aliases for templates and interfaces:

- contract type: `package:module:entity`, `module:entity`, `entity`;
- exercise type: `package:module:entity:choice`,
  `module:entity:choice`, `entity:choice`, `choice`.

For an exercised event, define its choice owner as
`event.interfaceId ?? event.templateId`. Use the choice owner only for `tpePk`
and exercise-type metadata. Continue using the concrete `templateId` (or the
known target creation) for `contractTpePk`, and continue using the concrete
template package for `packagePk`. Validate an interface identifier when it is
present.

Referenced-package loading combines three explicit sources: representative
creation packages, each exercise row's concrete package identity, and
choice-bearing type-identity packages. The second source loads the exercised
event's concrete template package and the third loads its interface package.
Contract type identities are not included wholesale, so a creation package is
still excluded when its distinct representative package is available.

## Data Flow

The Package Service archive is decoded once into a raw LF package. The existing
LF2 mapper derives package/template metadata, while a reader-local decoder
derives interface names and choices from the same raw package. Both become
canonical contract- and exercise-type rows during dataset creation.

History mapping records a concrete contract identity, an interface-owned
exercise identity when applicable, and package identities for both referenced
packages. Dataset remapping then links an exercise to its interface
`exerciseType`, concrete-template `contractType`, and concrete-template
`package`.

## Testing

Regression coverage will prove:

1. raw LF interface metadata is materialized with `payloadType: "interface"`
   and exact PQS aliases;
2. root type queries return an unobserved interface and its choice;
3. inherited exercise mapping uses the interface for type identity while
   retaining concrete contract/package semantics;
4. referenced package IDs contain representative, concrete exercised-template,
   and interface packages while excluding distinct creation-only provenance;
5. the completed dataset links all three edges to the intended rows.

Each behavior is run RED before production changes, then focused query and LF
package suites, the full offline query suite, lint, and both builds are run.
The controller owns the live parity rerun.
