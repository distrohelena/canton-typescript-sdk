export const liveCoverageStatuses = [
    "covered",
    "grpc-only",
    "json-only",
    "unsupported-on-json",
    "deferred-needs-write-path",
    "deferred-needs-domain-setup",
    "not-meaningful-on-empty-localnet",
    "not-implemented",
] as const;

export type LiveCoverageStatus = (typeof liveCoverageStatuses)[number];

export interface LiveCoverageEntry {
    readonly member: string;
    readonly transports: readonly ("grpc" | "json")[];
    readonly status: LiveCoverageStatus;
    readonly reason?: string;
}

export const cantonClientLiveCoverage: readonly LiveCoverageEntry[] = [
    {
        member: "disposeAsync",
        transports: ["grpc", "json"],
        status: "covered",
    },
    {
        member: "versionService.getLedgerApiVersionAsync",
        transports: ["grpc", "json"],
        status: "covered",
    },
    {
        member: "healthService.checkAsync",
        transports: ["grpc"],
        status: "covered",
    },
    {
        member: "partyManagementService.listKnownPartiesAsync",
        transports: ["grpc", "json"],
        status: "covered",
    },
    {
        member: "partyManagementService.getParticipantIdAsync",
        transports: ["grpc"],
        status: "covered",
    },
    {
        member: "partyManagementService.getPartiesAsync",
        transports: ["grpc"],
        status: "covered",
    },
    {
        member: "partyManagementService.allocatePartyAsync",
        transports: ["json"],
        status: "covered",
    },
    {
        member: "partyManagementService.generateExternalPartyTopologyAsync",
        transports: ["grpc"],
        status: "covered",
    },
    {
        member: "partyManagementService.allocateExternalPartyAsync",
        transports: ["grpc"],
        status: "covered",
    },
    {
        member: "userManagementService.grantUserRightsAsync",
        transports: ["grpc", "json"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs a sanctioned user-creation and rights-assertion flow before rights changes can be verified meaningfully.",
    },
    {
        member: "userManagementService.getUserAsync",
        transports: ["grpc"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs a sanctioned user-creation flow before user reads can be asserted.",
    },
    {
        member: "userManagementService.listUsersAsync",
        transports: ["grpc"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs a sanctioned user-creation flow before user listing can be asserted meaningfully.",
    },
    {
        member: "userManagementService.listUserRightsAsync",
        transports: ["grpc"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs a sanctioned user-creation and rights-assignment flow before rights reads can be asserted.",
    },
    {
        member: "commandInspectionService.getCommandStatusAsync",
        transports: ["grpc"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs a real command submission workflow before command status reads can be asserted.",
    },
    {
        member: "identityProviderConfigService.getIdentityProviderConfigAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "Current quickstart phase 1 focuses on participant and package flows, not identity provider configuration reads.",
    },
    {
        member: "identityProviderConfigService.listIdentityProviderConfigsAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "Current quickstart phase 1 focuses on participant and package flows, not identity provider configuration reads.",
    },
    {
        member: "packageService.listPackagesAsync",
        transports: ["grpc"],
        status: "covered",
    },
    {
        member: "packageService.getPackageAsync",
        transports: ["grpc"],
        status: "covered",
    },
    {
        member: "packageService.getPackageStatusAsync",
        transports: ["grpc"],
        status: "covered",
    },
    {
        member: "packageService.listVettedPackagesAsync",
        transports: ["grpc"],
        status: "deferred-needs-domain-setup",
        reason:
            "The live seed flow does not yet guarantee a meaningful vetted-package assertion on this quickstart profile.",
    },
    {
        member: "packageManagementService.uploadDarFileAsync",
        transports: ["json"],
        status: "covered",
    },
    {
        member: "packageManagementService.listKnownPackagesAsync",
        transports: ["json"],
        status: "covered",
    },
    {
        member: "participantPackageService.listPackagesAsync",
        transports: ["grpc"],
        status: "covered",
    },
    {
        member: "participantPackageService.getPackageContentsAsync",
        transports: ["grpc"],
        status: "covered",
    },
    {
        member: "participantPackageService.getPackageReferencesAsync",
        transports: ["grpc"],
        status: "covered",
    },
    {
        member: "participantPackageService.getDarAsync",
        transports: ["grpc"],
        status: "covered",
    },
    {
        member: "participantPackageService.listDarsAsync",
        transports: ["grpc"],
        status: "covered",
    },
    {
        member: "participantPackageService.getDarContentsAsync",
        transports: ["grpc"],
        status: "covered",
    },
    {
        member: "participantInspectionService.lookupOffsetByTimeAsync",
        transports: ["grpc"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage should wait for the DAR-backed command workflow so offset lookups can be correlated with known activity.",
    },
    {
        member: "participantInspectionService.countInFlightAsync",
        transports: ["grpc"],
        status: "not-meaningful-on-empty-localnet",
        reason:
            "An empty or steady-state localnet does not produce a meaningful in-flight baseline for this read.",
    },
    {
        member: "participantInspectionService.getConfigForSlowCounterParticipantsAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "This read is likely easy to add later, but it is outside the first live package-and-party coverage slice.",
    },
    {
        member: "participantInspectionService.getIntervalsBehindForCounterParticipantsAsync",
        transports: ["grpc"],
        status: "not-meaningful-on-empty-localnet",
        reason:
            "A healthy localnet with no lagging participants does not provide a meaningful assertion target here.",
    },
    {
        member: "participantInspectionService.lookupSentAcsCommitmentsAsync",
        transports: ["grpc"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs contract activity that produces ACS commitments before these reads are meaningful.",
    },
    {
        member: "participantInspectionService.lookupReceivedAcsCommitmentsAsync",
        transports: ["grpc"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs contract activity that produces ACS commitments before these reads are meaningful.",
    },
    {
        member: "participantInspectionService.openCommitmentAsync",
        transports: ["grpc"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs commitment-producing activity and known offsets before this read can be asserted.",
    },
    {
        member: "participantInspectionService.inspectCommitmentContractsAsync",
        transports: ["grpc"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs commitment-producing contracts before this inspection call becomes meaningful.",
    },
    {
        member: "participantPartyManagementService.getHighestOffsetByTimestampAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "This read is likely easy to add later, but the first live slice prioritizes package, participant-status, and party-management coverage.",
    },
    {
        member: "participantRepairService.listPendingOperationsAsync",
        transports: ["grpc"],
        status: "not-meaningful-on-empty-localnet",
        reason:
            "A healthy localnet commonly has no pending repair operations, so this would only prove the empty case.",
    },
    {
        member: "participantStatusService.getParticipantStatusAsync",
        transports: ["grpc"],
        status: "covered",
    },
    {
        member: "pruningService.getSafePruningOffsetAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "This read is likely easy to add later, but it is outside the first live package-and-party coverage slice.",
    },
    {
        member: "pruningService.getScheduleAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "This read is likely easy to add later, but it is outside the first live package-and-party coverage slice.",
    },
    {
        member: "pruningService.getParticipantScheduleAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "This read is likely easy to add later, but it is outside the first live package-and-party coverage slice.",
    },
    {
        member: "pruningService.getNoWaitCommitmentsFromAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "This read is likely easy to add later, but it is outside the first live package-and-party coverage slice.",
    },
    {
        member: "resourceManagementService.getResourceLimitsAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "This read is likely easy to add later, but it is outside the first live package-and-party coverage slice.",
    },
    {
        member: "identityInitializationService.getIdAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "This read is likely easy to add later, but it is outside the first live package-and-party coverage slice.",
    },
    {
        member: "identityInitializationService.currentTimeAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "This read is likely easy to add later, but it is outside the first live package-and-party coverage slice.",
    },
    {
        member: "synchronizerConnectivityService.listConnectedSynchronizersAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "This read is likely easy to add later, but it is outside the first live package-and-party coverage slice.",
    },
    {
        member: "synchronizerConnectivityService.getSynchronizerIdAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "This read is likely easy to add later, but it is outside the first live package-and-party coverage slice.",
    },
    {
        member: "synchronizerConnectivityService.listRegisteredSynchronizersAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "This read is likely easy to add later, but it is outside the first live package-and-party coverage slice.",
    },
    {
        member: "topologyManagerReadService.listNamespaceDelegationAsync",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "Raw topology reads need corresponding topology writes or sanctioned external setup before they are meaningful.",
    },
    {
        member: "topologyManagerReadService.listDecentralizedNamespaceDefinitionAsync",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "Raw topology reads need corresponding topology writes or sanctioned external setup before they are meaningful.",
    },
    {
        member: "topologyManagerReadService.listOwnerToKeyMappingAsync",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "Raw topology reads need corresponding topology writes or sanctioned external setup before they are meaningful.",
    },
    {
        member: "topologyManagerReadService.listPartyToKeyMappingAsync",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "Party topology reads need custom topology writes before they can be asserted meaningfully.",
    },
    {
        member: "topologyManagerReadService.listSynchronizerTrustCertificateAsync",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "Raw topology reads need corresponding topology writes or sanctioned external setup before they are meaningful.",
    },
    {
        member: "topologyManagerReadService.listParticipantSynchronizerPermissionAsync",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "Raw topology reads need corresponding topology writes or sanctioned external setup before they are meaningful.",
    },
    {
        member: "topologyManagerReadService.listPartyHostingLimitsAsync",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "Raw topology reads need corresponding topology writes or sanctioned external setup before they are meaningful.",
    },
    {
        member: "topologyManagerReadService.listVettedPackagesAsync",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "Topology-level vetted package reads need topology writes, not just DAR uploads, before they are meaningful.",
    },
    {
        member: "topologyManagerReadService.listPartyToParticipantAsync",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "Party topology reads need custom topology writes before they can be asserted meaningfully.",
    },
    {
        member: "topologyManagerReadService.listSynchronizerParametersStateAsync",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "Raw topology reads need corresponding topology writes or sanctioned external setup before they are meaningful.",
    },
    {
        member: "topologyManagerReadService.listSequencingParametersStateAsync",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "Raw topology reads need corresponding topology writes or sanctioned external setup before they are meaningful.",
    },
    {
        member: "topologyManagerReadService.listMediatorSynchronizerStateAsync",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "Raw topology reads need corresponding topology writes or sanctioned external setup before they are meaningful.",
    },
    {
        member: "topologyManagerReadService.listSequencerSynchronizerStateAsync",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "Raw topology reads need corresponding topology writes or sanctioned external setup before they are meaningful.",
    },
    {
        member: "topologyManagerReadService.listLsuAnnouncementAsync",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "Raw topology reads need corresponding topology writes or sanctioned external setup before they are meaningful.",
    },
    {
        member: "topologyManagerReadService.listLsuSequencerConnectionSuccessorAsync",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "Raw topology reads need corresponding topology writes or sanctioned external setup before they are meaningful.",
    },
    {
        member: "topologyManagerReadService.listAvailableStoresAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "This raw topology helper is less valuable than higher-priority participant and package reads in the first live slice.",
    },
    {
        member: "topologyManagerReadService.listAllAsync",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "Raw topology transaction reads need known topology changes before they can be asserted meaningfully.",
    },
    {
        member: "topologyManagerReadService.listAllV2Async",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "Raw topology transaction reads need known topology changes before they can be asserted meaningfully.",
    },
    {
        member: "trafficControlService.trafficControlStateAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "This read is likely easy to add later, but it is outside the first live package-and-party coverage slice.",
    },
    {
        member: "topologyAggregationService.listPartiesAsync",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "The user explicitly does not want topology aggregation coverage until custom topology writes exist.",
    },
    {
        member: "topologyAggregationService.listKeyOwnersAsync",
        transports: ["grpc"],
        status: "deferred-needs-write-path",
        reason:
            "The user explicitly does not want topology aggregation coverage until custom topology writes exist.",
    },
    {
        member: "commandService.submitAndWaitAsync",
        transports: ["grpc", "json"],
        status: "deferred-needs-domain-setup",
        reason:
            "Phase 2 needs a DAR-backed command workflow before command submission can be asserted live.",
    },
    {
        member: "commandSubmissionService.submitAsync",
        transports: ["grpc", "json"],
        status: "not-implemented",
        reason:
            "The public commandSubmissionService surface is reserved and currently unsupported in the SDK.",
    },
    {
        member: "commandCompletionService.getCompletionsAsync",
        transports: ["grpc"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs a real command workflow before completion-stream reads can be asserted.",
    },
    {
        member: "stateService.getActiveContractsPageAsync",
        transports: ["grpc", "json"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs a DAR-backed command workflow before contract state can be asserted.",
    },
    {
        member: "stateService.getActiveContractsAsync",
        transports: ["json"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs a DAR-backed command workflow before contract streaming can be asserted.",
    },
    {
        member: "stateService.getConnectedSynchronizersAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "This read is likely easy to add later, but it is outside the first live package-and-party coverage slice.",
    },
    {
        member: "stateService.getLedgerEndAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "This read is likely easy to add later, but it is outside the first live package-and-party coverage slice.",
    },
    {
        member: "stateService.getLatestPrunedOffsetsAsync",
        transports: ["grpc"],
        status: "grpc-only",
        reason:
            "This read is likely easy to add later, but it is outside the first live package-and-party coverage slice.",
    },
    {
        member: "updateService.getUpdatesAsync",
        transports: ["grpc"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs a DAR-backed command workflow before update streaming can be asserted.",
    },
    {
        member: "updateService.getUpdateByOffsetAsync",
        transports: ["grpc"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs a DAR-backed command workflow before update lookups can be asserted.",
    },
    {
        member: "updateService.getUpdateByIdAsync",
        transports: ["grpc"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs a DAR-backed command workflow before update lookups can be asserted.",
    },
    {
        member: "updateService.getUpdateByHashAsync",
        transports: ["grpc"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs a DAR-backed command workflow before update lookups can be asserted.",
    },
    {
        member: "updateService.getUpdatesPageAsync",
        transports: ["grpc"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs a DAR-backed command workflow before update paging can be asserted.",
    },
    {
        member: "eventQueryService.getEventsByContractIdAsync",
        transports: ["grpc"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs a DAR-backed command workflow before event-query reads can be asserted.",
    },
    {
        member: "contractService.getContractAsync",
        transports: ["grpc"],
        status: "deferred-needs-domain-setup",
        reason:
            "Live coverage needs a DAR-backed command workflow before contract reads can be asserted.",
    },
] as const;
