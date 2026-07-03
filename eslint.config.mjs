import helenaLinter from "@distrohelena/linter";

export default [
    {
        ignores: [
            "dist/**",
            "docs/**",
            "node_modules/**",
            "src/transports/grpc/generated/canton/**",
        ],
    },
    ...helenaLinter.configs.recommended,
];
