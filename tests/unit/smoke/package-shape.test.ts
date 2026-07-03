import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    HealthCheckStatus,
    HealthServiceClient,
    PartyManagementServiceClient,
    TransportKind,
    VersionServiceClient,
} from "../../../src";

describe("package surface", () => {
    it("exports the grpc-shaped root client types", () => {
        expect(CantonClient).toBeTypeOf("function");
        expect(CantonClientOptions).toBeTypeOf("function");
        expect(HealthServiceClient).toBeTypeOf("function");
        expect(HealthCheckStatus.serving).toBe("serving");
        expect(VersionServiceClient).toBeTypeOf("function");
        expect(PartyManagementServiceClient).toBeTypeOf("function");
        expect(TransportKind.grpc).toBe("grpc");
    });

    it("does not export legacy root surface names", async () => {
        const sdkModule = await import("../../../src/index.js");

        expect(sdkModule).not.toHaveProperty("SystemClient");
        expect(sdkModule).not.toHaveProperty("PartiesClient");
        expect(sdkModule).not.toHaveProperty("UsersClient");
        expect(sdkModule).not.toHaveProperty("PackagesClient");
        expect(sdkModule).not.toHaveProperty("ContractsClient");
        expect(sdkModule).not.toHaveProperty("EventsClient");
        expect(sdkModule).not.toHaveProperty("CommandsClient");
        expect(sdkModule).not.toHaveProperty("CreatePartyRequest");
        expect(sdkModule).not.toHaveProperty("CreatePartyResponse");
        expect(sdkModule).not.toHaveProperty("ListPartiesRequest");
        expect(sdkModule).not.toHaveProperty("ListPartiesResponse");
        expect(sdkModule).not.toHaveProperty("UploadPackageRequest");
        expect(sdkModule).not.toHaveProperty("UploadPackageResponse");
        expect(sdkModule).not.toHaveProperty("QueryContractsRequest");
        expect(sdkModule).not.toHaveProperty("QueryContractsResponse");
        expect(sdkModule).not.toHaveProperty("StreamQueryRequest");
        expect(sdkModule).not.toHaveProperty("StreamTransactionsRequest");
        expect(sdkModule).not.toHaveProperty("HealthStatusResponse");
    });
});
