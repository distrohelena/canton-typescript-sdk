import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    CantonClient,
    GetDarContentsRequest,
    GetDarRequest,
    GetPackageContentsRequest,
    GetPackageReferencesRequest,
    GetParticipantStatusRequest,
    ListDarsRequest,
    ParticipantListPackagesRequest,
    TransportKind,
} from "../../../src/index.js";
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
                new GetParticipantStatusRequest(),
            );

        expect(response.status?.uid.length).toBeGreaterThan(0);
        expect(response.status?.version.length).toBeGreaterThan(0);
        expect(response.status?.active).toBe(true);
    });

    it("lists participant packages and reads package contents", async () => {
        const seeded = await getLiveSeededContextAsync();

        const listResponse =
            await grpcClient.participantPackageService.listPackagesAsync(
                new ParticipantListPackagesRequest(),
            );

        const packageId = seeded.participantPackageIds[0];

        const contentsResponse =
            await grpcClient.participantPackageService.getPackageContentsAsync(
                new GetPackageContentsRequest({
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
                new GetPackageReferencesRequest({
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
