import { createHash } from "node:crypto";
import { CantonError } from "../../core/errors/canton-error.js";
import { DamlLfPackageLoader } from "../../daml-lf/daml-lf-package-loader.js";
import { DamlLfTemplate } from "../../daml-lf/model/daml-lf-template.js";
import { Lf2ModelMapper } from "../../daml-lf/model/lf-2-model-mapper.js";
import { Archive, HashFunction as ArchiveHashFunction } from "../../transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf.js";
import type { DefInterface, Package as LfArchivePackage, TemplateChoice } from "../../transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf2.js";
import { HashFunction as PackageServiceHashFunction, type GetPackageResponse, type ListPackagesResponse } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.js";
import { validDottedNameString, validNameString, validPackageIdString } from "./grpc-query-value-mapper.js";

export interface GrpcPackageService {
    listPackagesAsync(request: {}): Promise<ListPackagesResponse>;
    getPackageAsync(request: { packageId: string }): Promise<GetPackageResponse>;
}

export interface GrpcPackageChoiceMetadata {
    readonly choice: string;
    readonly consuming: boolean;
    readonly aliases: readonly string[];
    readonly choiceFqn: string;
}

export interface GrpcPackageTemplateMetadata {
    readonly moduleName: string;
    readonly entityName: string;
    readonly payloadType: "template" | "interface";
    readonly aliases: readonly string[];
    readonly templateFqn: string;
    readonly choices: readonly GrpcPackageChoiceMetadata[];
}

export interface GrpcPackageMetadata {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly templates: readonly GrpcPackageTemplateMetadata[];
}

/** An explicit package-service/LF decoding failure; callers never receive partial package rows. */
export class GrpcPackageRelationError extends CantonError {
    public constructor(public readonly packageId: string, message: string) {
        super(`gRPC query package ${packageId} could not be materialized: ${message}`);
        Object.freeze(this);
    }
}

/** Loads LF package metadata. Each call owns its promise map, so no package data enters QueryCacheStore. */
export class GrpcPackageRelationReader {
    public constructor(
        private readonly packageService: GrpcPackageService,
        private readonly packageLoader: DamlLfPackageLoader = new DamlLfPackageLoader(),
    ) {}

    public async readAllAsync(): Promise<readonly GrpcPackageMetadata[]> {
        let packageIds: readonly string[];

        try {
            packageIds = packageIdsSnapshot(await this.packageService.listPackagesAsync({}));
        } catch (error) {
            throw new GrpcPackageRelationError("<list>", errorMessage(error));
        }

        return this.readPackagesAsync(packageIds);
    }

    public async readPackagesAsync(packageIds: readonly string[]): Promise<readonly GrpcPackageMetadata[]> {
        const uniquePackageIds = new Set<string>();

        for (const packageId of packageIds) {
            try {
                validPackageDigest(packageId);
            } catch (error) {
                throw new GrpcPackageRelationError(typeof packageId === "string" ? packageId : "<invalid>", errorMessage(error));
            }

            uniquePackageIds.add(packageId);
        }

        const packages = await Promise.all([...uniquePackageIds].map((packageId) => this.readPackageAsync(packageId)));

        return Object.freeze(packages.slice().sort((left, right) => left.id.localeCompare(right.id)));
    }

    private async readPackageAsync(packageId: string): Promise<GrpcPackageMetadata> {
        let response: GetPackageResponse;

        try {
            response = await this.packageService.getPackageAsync({ packageId });
        } catch (error) {
            throw new GrpcPackageRelationError(packageId, errorMessage(error));
        }

        try {
            if (response.hash !== packageId) {
                throw new Error("Package Service response hash does not match its request");
            } else if (!(response.archivePayload instanceof Uint8Array) || response.archivePayload.length === 0) {
                throw new Error("Package Service response archive payload is missing");
            } else if (response.hashFunction !== PackageServiceHashFunction.SHA256) {
                throw new Error("Package Service response uses an unsupported hash function");
            }

            const digest = createHash("sha256").update(response.archivePayload).digest("hex");

            if (digest !== packageId || digest !== response.hash) {
                throw new Error("Package Service response archive payload does not match its SHA-256 hash");
            }

            const archive = Archive.toBinary({
                hashFunction: ArchiveHashFunction.SHA256,
                payload: response.archivePayload,
                hash: response.hash,
            });

            const result = this.packageLoader.loadRawPackageOrThrow(archive);

            const pkg = Lf2ModelMapper.mapPackage(result.packageId, result.rawPackage, result.languageVersion);

            const packageName = requiredPackageText(pkg.packageName, "name");

            const templates = [
                ...pkg.modules.flatMap((module) => module.definitions
                    .filter((definition): definition is DamlLfTemplate => definition instanceof DamlLfTemplate)
                    .map((template) => templateMetadata(packageId, packageName, module.name, template))),
                ...interfaceMetadata(packageId, packageName, result.rawPackage),
            ];

            return Object.freeze({
                id: packageId,
                name: packageName,
                version: requiredPackageText(pkg.packageVersion, "version"),
                templates: Object.freeze(templates),
            });
        } catch (error) {
            throw isGrpcPackageRelationError(error) ? error : new GrpcPackageRelationError(packageId, errorMessage(error));
        }
    }
}

function packageIdsSnapshot(response: unknown): readonly string[] {
    if (response === null || typeof response !== "object") {
        throw new Error("Package Service returned no package IDs");
    }

    const descriptor = Object.getOwnPropertyDescriptor(response, "packageIds");

    if (descriptor === undefined || !("value" in descriptor) || !Array.isArray(descriptor.value)) {
        throw new Error("Package Service returned no package IDs");
    }

    const packageIds = Array.from(descriptor.value, validPackageDigest);

    if (packageIds.length === 0) {
        throw new Error("Package Service returned no package IDs");
    }

    return Object.freeze(packageIds);
}

function validPackageDigest(value: unknown): string {
    if (typeof value !== "string") {
        throw new Error("Package Service package ID is invalid");
    }

    validPackageIdString(value, "package id");

    if (!/^[0-9a-f]{64}$/.test(value)) {
        throw new Error("Package Service package ID is not a lowercase SHA-256 digest");
    }

    return value;
}

function templateMetadata(packageId: string, packageName: string, moduleName: string, template: DamlLfTemplate): GrpcPackageTemplateMetadata {
    validDottedNameString(moduleName, "DAML-LF module name");
    validDottedNameString(template.templateId.templateName, "DAML-LF template name");

    const entityName = template.templateId.templateName;

    const templateFqn = `${packageName}:${moduleName}:${entityName}`;

    return Object.freeze({
        moduleName,
        entityName,
        payloadType: "template",
        aliases: contractTypeAliases(packageName, moduleName, entityName),
        templateFqn,
        choices: Object.freeze(template.choices.map((choice) => {
            validNameString(choice.name, "DAML-LF choice name");

            return Object.freeze({ choice: choice.name, consuming: choice.consuming, aliases: exerciseTypeAliases(packageName, moduleName, entityName, choice.name), choiceFqn: `${templateFqn}:${choice.name}` });
        }).sort((left, right) => left.choice.localeCompare(right.choice))),
    });
}

function interfaceMetadata(packageId: string, packageName: string, rawPackage: LfArchivePackage): readonly GrpcPackageTemplateMetadata[] {
    return rawPackage.modules.flatMap((module) => {
        const moduleName = resolveInternedDottedName(rawPackage, module.nameInternedDname);

        return module.interfaces.map((definition) => rawInterfaceMetadata(packageId, packageName, moduleName, definition, rawPackage));
    });
}

function rawInterfaceMetadata(packageId: string, packageName: string, moduleName: string, definition: DefInterface, rawPackage: LfArchivePackage): GrpcPackageTemplateMetadata {
    validDottedNameString(moduleName, "DAML-LF module name");

    const entityName = resolveInternedDottedName(rawPackage, definition.tyconInternedDname);

    validDottedNameString(entityName, "DAML-LF interface name");

    const templateFqn = `${packageName}:${moduleName}:${entityName}`;

    return Object.freeze({
        moduleName,
        entityName,
        payloadType: "interface",
        aliases: contractTypeAliases(packageName, moduleName, entityName),
        templateFqn,
        choices: Object.freeze(definition.choices.map((choice) => rawInterfaceChoiceMetadata(packageId, packageName, moduleName, entityName, choice, rawPackage))
            .sort((left, right) => left.choice.localeCompare(right.choice))),
    });
}

function rawInterfaceChoiceMetadata(packageId: string, packageName: string, moduleName: string, entityName: string, choice: TemplateChoice, rawPackage: LfArchivePackage): GrpcPackageChoiceMetadata {
    const choiceName = resolveInternedString(rawPackage, choice.nameInternedStr);

    validNameString(choiceName, `DAML-LF package ${packageId} interface choice name`);

    return Object.freeze({
        choice: choiceName,
        consuming: choice.consuming,
        aliases: exerciseTypeAliases(packageName, moduleName, entityName, choiceName),
        choiceFqn: `${packageName}:${moduleName}:${entityName}:${choiceName}`,
    });
}

function contractTypeAliases(packageName: string, moduleName: string, entityName: string): readonly string[] {
    return Object.freeze([`${packageName}:${moduleName}:${entityName}`, `${moduleName}:${entityName}`, entityName]);
}

function exerciseTypeAliases(packageName: string, moduleName: string, entityName: string, choiceName: string): readonly string[] {
    return Object.freeze([`${packageName}:${moduleName}:${entityName}:${choiceName}`, `${moduleName}:${entityName}:${choiceName}`, `${entityName}:${choiceName}`, choiceName]);
}

function resolveInternedDottedName(rawPackage: LfArchivePackage, index: number): string {
    const dottedName = rawPackage.internedDottedNames[index];

    if (dottedName === undefined) {
        throw new Error("DAML-LF interface references a missing interned dotted name");
    }

    return dottedName.segmentsInternedStr.map((segment) => resolveInternedString(rawPackage, segment)).join(".");
}

function resolveInternedString(rawPackage: LfArchivePackage, index: number): string {
    const value = rawPackage.internedStrings[index];

    if (value === undefined) {
        throw new Error("DAML-LF interface references a missing interned string");
    }

    return value;
}

function requiredPackageText(value: string, name: string): string {
    if (value.length === 0) {
        throw new Error(`DAML-LF package ${name} is missing`);
    }

    return value;
}

function errorMessage(error: unknown): string {
    try {
        const message = error instanceof Error ? error.message : String(error);

        return typeof message === "string" ? message : "Unknown package service error";
    } catch {
        return "Unknown package service error";
    }
}

function isGrpcPackageRelationError(error: unknown): error is GrpcPackageRelationError {
    try {
        return error instanceof GrpcPackageRelationError;
    } catch {
        return false;
    }
}
