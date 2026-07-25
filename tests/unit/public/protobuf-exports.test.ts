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

    const message = value.create();

    const json = value.toJson(message);

    expect(value.fromJson(json)).toEqual(message);
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

        const duration = google.protobuf.Duration.create({
            nanos: 250_000_000,
            seconds: "1",
        });

        expect(google.protobuf.Duration.toJson(duration)).toBe("1.250s");
        expect(google.protobuf.Duration.fromJson("1.250s")).toEqual(duration);
    });
});
