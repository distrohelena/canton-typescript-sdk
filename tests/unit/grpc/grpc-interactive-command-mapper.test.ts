import { describe, expect, it } from "vitest";
import {
    CreateCommand,
    SignCommandResult,
    SubmitCommandRequest,
} from "../../../src";
import { SigningAlgorithmSpec, SignatureFormat } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/crypto.js";
import { HashingSchemeVersion } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/interactive/interactive_submission_service.js";
import {
    mapGrpcExecuteSubmissionAndWaitRequest,
    mapGrpcPrepareSubmissionRequest,
} from "../../../src/transports/grpc/mappers/interactive-command-mapper.js";

describe("grpc interactive command mapper", () => {
    it("maps prepare submission requests with user and command context", () => {
        const payload = mapGrpcPrepareSubmissionRequest(
            new SubmitCommandRequest({
                applicationId: "app-1",
                userId: "wallet-user",
                actAs: ["Alice"],
                readAs: ["Bob"],
                command: new CreateCommand({
                    templateId: "Main:Iou",
                    payload: {
                        issuer: "Alice",
                    },
                }),
            }),
            "command-1",
        );

        expect(payload).toMatchObject({
            userId: "wallet-user",
            commandId: "command-1",
            actAs: ["Alice"],
            readAs: ["Bob"],
            commands: [
                {
                    command: {
                        oneofKind: "create",
                    },
                },
            ],
        });
    });

    it("maps execute-and-wait requests with party signatures", () => {
        const request = new SubmitCommandRequest({
            applicationId: "app-1",
            userId: "wallet-user",
            actAs: ["Alice"],
            command: new CreateCommand({
                templateId: "Main:Iou",
                payload: {
                    issuer: "Alice",
                },
            }),
        });

        const payload = mapGrpcExecuteSubmissionAndWaitRequest({
            request,
            preparedTransaction: {},
            hashingSchemeVersion: HashingSchemeVersion.V3,
            submissionId: "submission-1",
            signerResult: new SignCommandResult({
                algorithm: "ed25519",
                signature: new Uint8Array([1, 2, 3]),
                signedBy: "fingerprint::1",
            }),
        });

        expect(payload).toMatchObject({
            userId: "wallet-user",
            submissionId: "submission-1",
            hashingSchemeVersion: HashingSchemeVersion.V3,
            partySignatures: {
                signatures: [
                    {
                        party: "Alice",
                        signatures: [
                            {
                                format: SignatureFormat.CONCAT,
                                signingAlgorithmSpec: SigningAlgorithmSpec.ED25519,
                                signature: new Uint8Array([1, 2, 3]),
                                signedBy: "fingerprint::1",
                            },
                        ],
                    },
                ],
            },
        });
    });
});
