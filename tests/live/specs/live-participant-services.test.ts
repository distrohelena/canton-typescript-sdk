import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    CantonClient,
    GetDarContentsRequest,
    GetDarRequest,
    ListDarsRequest,
    TransportKind,
} from "../../../src/index.js";
import {
    GetPackageContentsRequest,
    GetPackageReferencesRequest,
    ParticipantListPackagesRequest,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.js";
import { ParticipantStatusRequest } from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_status_service.js";
import { createLiveClient } from "../runtime/live-client-factory.js";
import { createLiveTestEnvironment } from "../runtime/live-test-environment.js";
import { getLiveSeededContextAsync } from "../runtime/live-seeded-context.js";

describe("live participant services", () => {
    let grpcClient: CantonClient;

    beforeAll(() => {
        grpcClient = createLiveClient(
            createLiveTestEnvironment({
                transportKind: TransportKind.grpc,
            }),
        );
    });

    afterAll(async () => {
        await grpcClient.disposeAsync();
    });

    it("reads participant status", async () => {
        const response =
            await grpcClient.participantStatusService.getParticipantStatusAsync(
                ParticipantStatusRequest.create(),
            );

        expect(response.kind.oneofKind).toBe("status");

        if (response.kind.oneofKind !== "status") {
            throw new Error("participant did not return an initialized status");
        }

        expect(response.kind.status.commonStatus?.uid.length).toBeGreaterThan(0);
        expect(response.kind.status.commonStatus?.version.length).toBeGreaterThan(0);
        expect(response.kind.status.active).toBe(true);
    });

    it("lists participant packages and reads package contents", async () => {
        const seeded = await getLiveSeededContextAsync();

        const listResponse =
            await grpcClient.participantPackageService.listPackagesAsync(
                ParticipantListPackagesRequest.create(),
            );

        const packageId = seeded.participantPackageIds[0];

        const contentsResponse =
            await grpcClient.participantPackageService.getPackageContentsAsync(
                GetPackageContentsRequest.create({
                    packageId,
                }),
            );

        expect(
            listResponse.packageDescriptions.map((item) => item.packageId),
        ).toEqual(expect.arrayContaining([...seeded.participantPackageIds]));
        expect(contentsResponse.description?.packageId).toBe(packageId);
        expect(contentsResponse.languageVersion.length).toBeGreaterThan(0);
    });

    it("reads participant package references", async () => {
        const seeded = await getLiveSeededContextAsync();

        const referencesResponse =
            await grpcClient.participantPackageService.getPackageReferencesAsync(
                GetPackageReferencesRequest.create({
                    packageId: seeded.participantPackageIds[0],
                }),
            );

        expect(
            referencesResponse.dars.some(
                (item) => item.main === seeded.participantDarMainPackageId,
            ),
        ).toBe(true);
    }, 15_000);

    it("lists and reads participant dar archives", async () => {
        const seeded = await getLiveSeededContextAsync();

        const listResponse =
            await grpcClient.participantPackageService.listDarsAsync(
                new ListDarsRequest(),
            );

        const contentsResponse =
            await grpcClient.participantPackageService.getDarContentsAsync(
                new GetDarContentsRequest({
                    mainPackageId: seeded.participantDarMainPackageId,
                }),
            );

        const darResponse = await grpcClient.participantPackageService.getDarAsync(
            new GetDarRequest({
                mainPackageId: seeded.participantDarMainPackageId,
            }),
        );

        expect(
            listResponse.dars.some(
                (item) => item.main === seeded.participantDarMainPackageId,
            ),
        ).toBe(true);
        expect(contentsResponse.packages.length).toBeGreaterThan(0);
        expect(darResponse.payload.length).toBeGreaterThan(0);
        expect(darResponse.data?.main).toBe(seeded.participantDarMainPackageId);
    });
});
