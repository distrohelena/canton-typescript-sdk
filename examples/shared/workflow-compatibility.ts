import {
    CantonClient,
    RequestOptions,
} from "@distrohelena/canton-typescript-sdk";
import { comDigitalasset } from "@distrohelena/canton-typescript-sdk/protobuf";
import type { WorkflowFailureKind } from "./workflow-errors.js";

export interface WorkflowCompatibility {
    readonly participantVersion: string;
    readonly releaseCore: "3.5.7" | "3.5.8";
    readonly path: "common" | string;
    readonly acceptedGrpcCodes: Readonly<
        Record<WorkflowFailureKind, readonly string[]>
    >;
}

const commonAcceptedGrpcCodes: WorkflowCompatibility["acceptedGrpcCodes"] = {
    invalidChoice: ["INVALID_ARGUMENT"],
    duplicateCommand: ["ALREADY_EXISTS"],
    staleContract: ["INVALID_ARGUMENT", "NOT_FOUND"],
};

export function parseWorkflowReleaseCore(
    participantVersion: string,
): "3.5.7" | "3.5.8" {
    const match = /^(3\.5\.[78])(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(
        participantVersion,
    );

    if (match === null) {
        throw new Error(
            `Unsupported workflow participant version '${participantVersion}'. Expected a 3.5.7 or 3.5.8 release.`,
        );
    }

    return match[1] as "3.5.7" | "3.5.8";
}

export async function readWorkflowCompatibilityAsync(
    client: Pick<CantonClient, "participantStatusService">,
    budget: { readonly remainingTimeoutMs: () => number },
): Promise<WorkflowCompatibility> {
    const request = comDigitalasset.canton.admin.participant.v30.ParticipantStatusRequest.create();

    const response = await client.participantStatusService.getParticipantStatusAsync(
        request,
        new RequestOptions({ timeoutMs: budget.remainingTimeoutMs() }),
    );

    if (response.kind.oneofKind !== "status") {
        throw new Error("Participant admin status did not include an initialized status.");
    }

    const status = response.kind.status;

    if (!status.active) {
        throw new Error("Participant admin status reported an inactive participant.");
    }

    const participantVersion = status.commonStatus?.version;

    if (participantVersion === undefined || !participantVersion.trim()) {
        throw new Error("Participant admin status did not include a non-empty version.");
    }

    return {
        participantVersion,
        releaseCore: parseWorkflowReleaseCore(participantVersion),
        path: "common",
        acceptedGrpcCodes: commonAcceptedGrpcCodes,
    };
}
