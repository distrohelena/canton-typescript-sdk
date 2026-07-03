import {
    Archive,
    ArchivePayload,
} from "../../transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf.js";
import { DamlLfDecodeException } from "../errors/daml-lf-decode.exception.js";
import { DamlLfVersionNotSupportedException } from "../errors/daml-lf-version-not-supported.exception.js";
import { ArchivePayloadEnvelope } from "./archive-payload-envelope.js";
import { DamlLfLanguageVersion } from "./daml-lf-language-version.js";

export class ArchivePayloadDecoder {
    public static decodeArchiveOrThrow(
        archiveBytes: Uint8Array,
    ): ArchivePayloadEnvelope {
        try {
            const archive = Archive.fromBinary(archiveBytes);
            const payload = ArchivePayload.fromBinary(archive.payload);
            const languageVersion =
                ArchivePayloadDecoder.getLanguageVersionOrThrow(payload);
            const packagePayload =
                ArchivePayloadDecoder.getPackagePayloadOrThrow(payload);

            return new ArchivePayloadEnvelope({
                languageVersion,
                packagePayload,
            });
        } catch (error) {
            if (
                error instanceof DamlLfVersionNotSupportedException ||
                error instanceof DamlLfDecodeException
            ) {
                throw error;
            }

            throw new DamlLfDecodeException(
                error instanceof Error
                    ? error.message
                    : "failed to decode daml lf archive payload",
            );
        }
    }

    private static getLanguageVersionOrThrow(
        payload: ArchivePayload,
    ): DamlLfLanguageVersion {
        switch (payload.sum.oneofKind) {
            case "damlLf2":
                return new DamlLfLanguageVersion({
                    major: 2,
                    minor: payload.minor,
                    patch: payload.patch,
                });
            case "damlLf1":
                return new DamlLfLanguageVersion({
                    major: 1,
                    minor: payload.minor,
                    patch: payload.patch,
                });
            default:
                throw new DamlLfVersionNotSupportedException(
                    "daml lf archive payload does not declare a supported package kind",
                );
        }
    }

    private static getPackagePayloadOrThrow(payload: ArchivePayload): Uint8Array {
        switch (payload.sum.oneofKind) {
            case "damlLf2":
                return payload.sum.damlLf2;
            case "damlLf1":
                throw new DamlLfVersionNotSupportedException(
                    "daml lf 1.x is not supported yet",
                );
            default:
                throw new DamlLfVersionNotSupportedException(
                    "daml lf archive payload does not contain a package body",
                );
        }
    }
}
