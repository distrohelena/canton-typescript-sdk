import { describe, expect, it } from "vitest";
import {
    GrantUserRightsRequest,
    PackageFormat,
    UploadPackageRequest,
    UserRightKind,
} from "../../../src";
import {
    mapGrpcCreatePartyRequest,
    mapGrpcCreateParty,
    mapGrpcListParties,
    mapGrpcListPartiesRequest,
} from "../../../src/transports/grpc/mappers/parties-mapper.js";
import { CreatePartyRequest, ListPartiesRequest } from "../../../src";
import { mapGrpcUploadPackageRequest } from "../../../src/transports/grpc/mappers/packages-mapper.js";
import { mapGrpcHealth } from "../../../src/transports/grpc/mappers/system-mapper.js";
import { mapGrpcGrantUserRightsRequest } from "../../../src/transports/grpc/mappers/users-mapper.js";

describe("gRPC operational mappers", () => {
    it("maps health payloads", () => {
        const result = mapGrpcHealth({ version: "3.4.0", features: {} });

        expect(result.status).toBe("healthy");
        expect(result.version).toBe("3.4.0");
    });

    it("maps party creation requests", () => {
        const result = mapGrpcCreatePartyRequest(
            new CreatePartyRequest({ partyIdHint: "Alice" }),
        );

        expect(result).toMatchObject({
            partyIdHint: "Alice",
            identityProviderId: "",
            synchronizerId: "",
            userId: "",
        });
    });

    it("maps party creation payloads", () => {
        const result = mapGrpcCreateParty({
            partyDetails: { party: "Alice" },
        });

        expect(result.party).toBe("Alice");
    });

    it("maps list parties requests", () => {
        const result = mapGrpcListPartiesRequest(
            new ListPartiesRequest({
                identityProviderId: "default",
                filterParty: "Alice",
                pageSize: 25,
                pageToken: "token-1",
            }),
        );

        expect(result).toMatchObject({
            identityProviderId: "default",
            filterParty: "Alice",
            pageSize: 25,
            pageToken: "token-1",
        });
    });

    it("maps list parties responses", () => {
        const result = mapGrpcListParties({
            partyDetails: [
                {
                    party: "Alice",
                    isLocal: true,
                    localMetadata: {
                        resourceVersion: "1",
                        annotations: { region: "us" },
                    },
                    identityProviderId: "default",
                },
            ],
            nextPageToken: "next-1",
        });

        expect(result.partyDetails[0]).toMatchObject({
            party: "Alice",
            isLocal: true,
            identityProviderId: "default",
        });
        expect(result.nextPageToken).toBe("next-1");
    });

    it("maps grant-user-rights requests to real protobuf oneofs", () => {
        const result = mapGrpcGrantUserRightsRequest(
            new GrantUserRightsRequest({
                userId: "carol",
                rights: [{ type: UserRightKind.participantAdmin }],
            }),
        );

        expect(result).toMatchObject({
            userId: "carol",
            identityProviderId: "",
            rights: [
                {
                    kind: {
                        oneofKind: "participantAdmin",
                    },
                },
            ],
        });
    });

    it("maps upload-package requests to dar upload requests", () => {
        const result = mapGrpcUploadPackageRequest(
            new UploadPackageRequest({
                bytes: new Uint8Array([1, 2, 3]),
                format: PackageFormat.dar,
            }),
        );

        expect(result).toMatchObject({
            darFile: new Uint8Array([1, 2, 3]),
            submissionId: "",
            vettingChange: 0,
            synchronizerId: "",
        });
    });
});
