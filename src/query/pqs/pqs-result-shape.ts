import type { NormalizedInclude, NormalizedSelection } from "../canonical/query-ast.js";
import { PqsRelation, pqsRelationEdges, pqsRelationMetadata } from "./pqs-schema-profile.js";

export interface PqsSelectedScalarField { readonly name: string; }
export interface PqsJsonResultProjection { readonly name: string; readonly field: string; readonly path: readonly string[]; readonly as: "text" | "numeric" | "boolean" | "timestamp"; }
export interface PqsIncludedResultShape { readonly edge: string; readonly target: PqsRelation; readonly cardinality: "one" | "many"; readonly shape: PqsRelationResultShape; }
export interface PqsRelationResultShape { readonly relation: PqsRelation; readonly cardinality: "one" | "many"; readonly fields: readonly PqsSelectedScalarField[]; readonly json: readonly PqsJsonResultProjection[]; readonly includes: readonly PqsIncludedResultShape[]; }

export function compilePqsResultShape(relation: PqsRelation, cardinality: "one" | "many", selection: NormalizedSelection | undefined, includes: readonly NormalizedInclude[]): PqsRelationResultShape {
    const fields = relation === "__contracts"
        ? selection?.fields ?? ["contractId", "templateId", "packageId", "payload", "witnesses", "createdEventOffset", "createdAt", "archivedEventOffset", "archivedAt", "active"]
        : selection?.fields ?? Object.keys(pqsRelationMetadata[relation].fields);
    const shape: PqsRelationResultShape = {
        relation,
        cardinality,
        fields: fields.map((name) => Object.freeze({ name })),
        json: (selection?.json ?? []).map((projection) => Object.freeze({ ...projection, path: Object.freeze([...projection.path]) })),
        includes: includes.map((include) => {
            const edge = pqsRelationEdges[relation]?.[include.edge];
            if (edge === undefined || edge.target !== relationForCanonical(include.relation) || edge.cardinality !== include.cardinality) throw new Error(`Invalid canonical include ${include.edge}`);
            return Object.freeze({ edge: include.edge, target: edge.target, cardinality: include.cardinality, shape: compilePqsResultShape(edge.target, include.cardinality, include.select, include.includes) });
        }),
    };
    Object.freeze(shape.fields);
    Object.freeze(shape.json);
    Object.freeze(shape.includes);
    return Object.freeze(shape);
}

function relationForCanonical(relation: string): PqsRelation | undefined {
    return ({ contracts: "__contracts", contractTypes: "__contract_tpe", events: "__events", exercises: "__exercises", exerciseTypes: "__exercise_tpe", packages: "__packages", transactions: "__transactions", watermark: "__watermark" } as const)[relation as "contracts" | "contractTypes" | "events" | "exercises" | "exerciseTypes" | "packages" | "transactions" | "watermark"];
}
