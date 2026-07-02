import { describe, expect, it } from "vitest";
import { SubmitCommandRequest, ValidationError } from "../../../src";

describe("request validation", () => {
  it("rejects a submit request without an acting party", () => {
    expect(
      () =>
        new SubmitCommandRequest({
          applicationId: "app-1",
          actAs: []
        })
    ).toThrow(ValidationError);
  });
});
