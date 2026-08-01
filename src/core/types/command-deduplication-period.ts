export type CommandDeduplicationPeriod =
    | { readonly kind: "duration"; readonly seconds: number }
    | { readonly kind: "offset"; readonly offset: string };
