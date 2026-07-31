export function runExampleAsync(
    name: string,
    main: () => Promise<void>,
): void {
    void Promise.resolve().then(main).catch(error => {
        const message =
            error instanceof Error ? error.message : String(error);

        const failure = new Error(`Example ${name} failed: ${message}`, {
            cause: error,
        });

        console.error(failure.message);
        process.exitCode = 1;
    });
}
