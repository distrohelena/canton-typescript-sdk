export class TestingConfigurationError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "TestingConfigurationError";
    }
}
