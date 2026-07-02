import { IJsonHttpClient } from "../../src/transports/json/jsonHttpClient.js";

export function createFakeJsonHttpClient(
  handlers: Record<string, unknown>
): IJsonHttpClient {
  return {
    async getAsync(path: string): Promise<unknown> {
      return handlers[path] ?? {};
    },
    async postAsync(path: string): Promise<unknown> {
      return handlers[path] ?? {};
    }
  };
}
