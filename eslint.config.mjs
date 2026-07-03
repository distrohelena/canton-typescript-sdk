import helenaLinter from "@distrohelena/linter";

export default [
    {
        ignores: ["dist/**", "docs/**", "node_modules/**"],
    },
    ...helenaLinter.configs.recommended,
];
