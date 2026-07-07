import { CantonClient } from "../../../src/index.js";
import { LiveTestEnvironment } from "./live-test-environment.js";

export function createLiveClient(
    environment: LiveTestEnvironment,
): CantonClient {
    return new CantonClient(environment.options);
}
