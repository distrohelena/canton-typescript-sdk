export const SourceMappingPrecision = {
    exact: "exact",
    fallback: "fallback",
} as const;

export type SourceMappingPrecision =
    (typeof SourceMappingPrecision)[keyof typeof SourceMappingPrecision];
