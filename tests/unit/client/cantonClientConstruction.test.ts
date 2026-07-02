import { describe, expect, it } from "vitest";
import { CantonClient, CantonClientOptions, TransportKind } from "../../../src";

describe("CantonClient", () => {
  it("creates shared service objects", () => {
    const client = new CantonClient(
      new CantonClientOptions({
        transportKind: TransportKind.json,
        endpoint: "https://participant.example.com"
      })
    );

    expect(client.commands).toBeDefined();
    expect(client.contracts).toBeDefined();
    expect(client.system).toBeDefined();
  });
});
