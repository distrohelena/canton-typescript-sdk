import { TemplateId } from "../../query/model-types.js";

export class DamlUnit {}
export class DamlDate { public constructor(public readonly daysSinceEpoch: number) {} }
export class DamlTimestamp { public constructor(public readonly microsecondsSinceEpoch: string) {} }
export class DamlTextMap { public constructor(public readonly entries: readonly (readonly [string, unknown])[]) {} }
export class DamlGenMap { public constructor(public readonly entries: readonly (readonly [unknown, unknown])[]) {} }
export class DamlVariant { public constructor(public readonly constructorName: string, public readonly value: unknown, public readonly variantId?: TemplateId) {} }
export class DamlEnum { public constructor(public readonly constructorName: string, public readonly enumId?: TemplateId) {} }
export class DamlRecord { public constructor(public readonly fields: Readonly<Record<string, unknown>>, public readonly recordId?: TemplateId) {} }
