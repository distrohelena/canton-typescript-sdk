import { describe, expect, it } from "vitest";
import {
    CreateCommand,
    DamlRecord,
    SignCommandResult,
    SubmitCommandRequest,
    ValidationError,
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
                    templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                    createArguments: new DamlRecord({
                        issuer: "Alice",
                    }),
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

    it("maps caller-controlled command identity for interactive prepare", () => {
        const request = new SubmitCommandRequest({
            applicationId: "app-1",
            actAs: ["Alice"],
            commandId: "retry-command-1",
            command: new CreateCommand({
                templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                createArguments: new DamlRecord({}),
            }),
        });

        expect(mapGrpcPrepareSubmissionRequest(request, request.commandId!)).toMatchObject({
            commandId: "retry-command-1",
        });
    });

    it("maps execute-and-wait requests with party signatures", () => {
        const request = new SubmitCommandRequest({
            applicationId: "app-1",
            userId: "wallet-user",
            actAs: ["Alice"],
            command: new CreateCommand({
                templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                createArguments: new DamlRecord({
                    issuer: "Alice",
                }),
            }),
        });

        const payload = mapGrpcExecuteSubmissionAndWaitRequest({
            request,
            preparedTransaction: {},
            hashingSchemeVersion: HashingSchemeVersion.V3,
            submissionId: "submission-1",
            signerResults: [{
                party: "Alice",
                result: new SignCommandResult({
                    algorithm: "ed25519",
                    signature: new Uint8Array([1, 2, 3]),
                    signedBy: "fingerprint::1",
                }),
            }],
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

    it("maps duration and positive offset deduplication for interactive execute", () => {
        const request = (deduplicationPeriod: { readonly kind: "duration"; readonly seconds: number } | { readonly kind: "offset"; readonly offset: string }) => new SubmitCommandRequest({
            applicationId: "app-1",
            actAs: ["Alice"],
            deduplicationPeriod,
            command: new CreateCommand({
                templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                createArguments: new DamlRecord({}),
            }),
        });
        const init = (request: SubmitCommandRequest) => ({
            request,
            preparedTransaction: {},
            hashingSchemeVersion: HashingSchemeVersion.V3,
            submissionId: "submission-1",
            signerResults: [],
        });

        expect(mapGrpcExecuteSubmissionAndWaitRequest(init(request({ kind: "duration", seconds: 30 })))).toMatchObject({
            deduplicationPeriod: {
                oneofKind: "deduplicationDuration",
                deduplicationDuration: { seconds: "30", nanos: 0 },
            },
        });
        expect(mapGrpcExecuteSubmissionAndWaitRequest(init(request({ kind: "offset", offset: "1" })))).toMatchObject({
            deduplicationPeriod: {
                oneofKind: "deduplicationOffset",
                deduplicationOffset: "1",
            },
        });
        expect(() => mapGrpcExecuteSubmissionAndWaitRequest(init(request({ kind: "offset", offset: "0" })))).toThrow(ValidationError);
    });
});
