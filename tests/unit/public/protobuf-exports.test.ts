import { describe, expect, it } from "vitest";
import {
    canton,
    comDaml,
    comDigitalasset,
    google,
    ledgerApiV2,
} from "@distrohelena/canton-typescript-sdk/protobuf";

function expectMessageType(value: {
    create: () => unknown;
    fromJson: (json: unknown) => unknown;
    toJson: (message: unknown) => unknown;
}) {
    expect(value.create).toBeTypeOf("function");
    expect(value.fromJson).toBeTypeOf("function");
    expect(value.toJson).toBeTypeOf("function");
}

describe("protobuf public exports", () => {
    it("exposes protobuf-ts message values in non-colliding namespaces", () => {
        expectMessageType(ledgerApiV2.GetUpdateByIdRequest);
        expectMessageType(canton.platform.v1.StatusDetails);
        expectMessageType(comDaml.ledger.api.v2.GetUpdateByIdRequest);
        expectMessageType(
            comDigitalasset.canton.sequencer.api.v30.SendAsyncRequest,
        );
        expectMessageType(google.protobuf.Duration);

        expect(ledgerApiV2.GetUpdateByIdRequest.create()).toMatchObject({});
    });
});
