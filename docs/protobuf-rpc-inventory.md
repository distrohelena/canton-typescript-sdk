# Protobuf RPC disposition inventory

This is the migration source of truth for every declared public transport and gRPC operation. It is enforced by `tests/unit/public/protobuf-rpc-inventory.test.ts` against the two interfaces.

`direct-rpc` entries record exact generated `module#symbol` request and unary/stream response identities derived from generated client signatures. `high-level` retains SDK workflows, including the JSON-only active-contract observer stream; `removed` is a legacy internal alias.

## Structured inventory

```json
[
  {
    "surface": "ITransport",
    "method": "disposeAsync",
    "serviceRpc": "Dispose service/RPC (see grpc-channel-factory)",
    "generatedRequest": "generated.DisposeRequest",
    "generatedResponse": "generated.DisposeResponse",
    "disposition": "high-level",
    "grpcOperation": "GrpcOperations.disposeAsync",
    "json": {
      "status": "unsupported",
      "error": "Dispose is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getLedgerApiVersionAsync",
    "serviceRpc": "versionServiceClient.getLedgerApiVersion",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/version_service.ts#GetLedgerApiVersionRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/version_service.ts#GetLedgerApiVersionResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getHealthAsync",
    "json": {
      "status": "supported",
      "endpoint": "/v2/version",
      "projection": "explicit JsonTransport request projection",
      "reconstruction": "explicit JsonTransport response reconstruction"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "checkHealthAsync",
    "serviceRpc": "healthClient.check",
    "generatedRequest": "src/transports/grpc/generated/canton/google/grpc/health/v1/health.ts#HealthCheckRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/google/grpc/health/v1/health.ts#HealthCheckResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.checkHealthAsync",
    "json": {
      "status": "unsupported",
      "error": "CheckHealth is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "allocatePartyAsync",
    "serviceRpc": "partyManagementServiceClient.allocateParty",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.ts#AllocatePartyRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.ts#AllocatePartyResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.createPartyAsync",
    "json": {
      "status": "supported",
      "endpoint": "/v2/parties",
      "projection": "explicit JsonTransport request projection",
      "reconstruction": "explicit JsonTransport response reconstruction"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "generateExternalPartyTopologyAsync",
    "serviceRpc": "GenerateExternalPartyTopology service/RPC (see grpc-channel-factory)",
    "generatedRequest": "generated.GenerateExternalPartyTopologyRequest",
    "generatedResponse": "generated.GenerateExternalPartyTopologyResponse",
    "disposition": "high-level",
    "grpcOperation": "GrpcOperations.generateExternalPartyTopologyAsync",
    "json": {
      "status": "unsupported",
      "error": "GenerateExternalPartyTopology is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "allocateExternalPartyAsync",
    "serviceRpc": "AllocateExternalParty service/RPC (see grpc-channel-factory)",
    "generatedRequest": "generated.AllocateExternalPartyRequest",
    "generatedResponse": "generated.AllocateExternalPartyResponse",
    "disposition": "high-level",
    "grpcOperation": "GrpcOperations.allocateExternalPartyAsync",
    "json": {
      "status": "unsupported",
      "error": "AllocateExternalParty is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listKnownPartiesAsync",
    "serviceRpc": "partyManagementServiceClient.listKnownParties",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.ts#ListKnownPartiesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.ts#ListKnownPartiesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listPartiesAsync",
    "json": {
      "status": "supported",
      "endpoint": "/v2/parties",
      "projection": "explicit JsonTransport request projection",
      "reconstruction": "explicit JsonTransport response reconstruction"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getParticipantIdAsync",
    "serviceRpc": "partyManagementServiceClient.getParticipantId",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.ts#GetParticipantIdRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.ts#GetParticipantIdResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getParticipantIdAsync",
    "json": {
      "status": "unsupported",
      "error": "GetParticipantId is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getPartiesAsync",
    "serviceRpc": "partyManagementServiceClient.getParties",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.ts#GetPartiesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.ts#GetPartiesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getPartiesAsync",
    "json": {
      "status": "unsupported",
      "error": "GetParties is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "grantUserRightsAsync",
    "serviceRpc": "userManagementServiceClient.grantUserRights",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.ts#GrantUserRightsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.ts#GrantUserRightsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.grantUserRightsAsync",
    "json": {
      "status": "supported",
      "endpoint": "/v1/user/rights/grant",
      "projection": "explicit JsonTransport request projection",
      "reconstruction": "explicit JsonTransport response reconstruction"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getCommandStatusAsync",
    "serviceRpc": "commandInspectionServiceClient.getCommandStatus",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/command_inspection_service.ts#GetCommandStatusRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/command_inspection_service.ts#GetCommandStatusResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getCommandStatusAsync",
    "json": {
      "status": "unsupported",
      "error": "GetCommandStatus is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getUserAsync",
    "serviceRpc": "userManagementServiceClient.getUser",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.ts#GetUserRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.ts#GetUserResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getUserAsync",
    "json": {
      "status": "unsupported",
      "error": "GetUser is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listUsersAsync",
    "serviceRpc": "userManagementServiceClient.listUsers",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.ts#ListUsersRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.ts#ListUsersResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listUsersAsync",
    "json": {
      "status": "unsupported",
      "error": "ListUsers is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listUserRightsAsync",
    "serviceRpc": "userManagementServiceClient.listUserRights",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.ts#ListUserRightsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.ts#ListUserRightsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listUserRightsAsync",
    "json": {
      "status": "unsupported",
      "error": "ListUserRights is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "uploadDarFileAsync",
    "serviceRpc": "packageManagementServiceClient.uploadDarFile",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.ts#UploadDarFileRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.ts#UploadDarFileResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.uploadPackageAsync",
    "json": {
      "status": "supported",
      "endpoint": "/v1/packages",
      "projection": "explicit JsonTransport request projection",
      "reconstruction": "explicit JsonTransport response reconstruction"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listKnownPackagesAsync",
    "serviceRpc": "packageManagementServiceClient.listKnownPackages",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.ts#ListKnownPackagesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.ts#ListKnownPackagesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listKnownPackagesAsync",
    "json": {
      "status": "unsupported",
      "error": "ListKnownPackages is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getIdentityProviderConfigAsync",
    "serviceRpc": "identityProviderConfigServiceClient.getIdentityProviderConfig",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/identity_provider_config_service.ts#GetIdentityProviderConfigRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/identity_provider_config_service.ts#GetIdentityProviderConfigResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getIdentityProviderConfigAsync",
    "json": {
      "status": "unsupported",
      "error": "GetIdentityProviderConfig is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listIdentityProviderConfigsAsync",
    "serviceRpc": "identityProviderConfigServiceClient.listIdentityProviderConfigs",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/identity_provider_config_service.ts#ListIdentityProviderConfigsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/identity_provider_config_service.ts#ListIdentityProviderConfigsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listIdentityProviderConfigsAsync",
    "json": {
      "status": "unsupported",
      "error": "ListIdentityProviderConfigs is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listPackagesAsync",
    "serviceRpc": "ledgerPackageServiceClient.listPackages",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.ts#ListPackagesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.ts#ListPackagesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listPackagesAsync",
    "json": {
      "status": "unsupported",
      "error": "ListPackages is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getPackageAsync",
    "serviceRpc": "ledgerPackageServiceClient.getPackage",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.ts#GetPackageRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.ts#GetPackageResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getPackageAsync",
    "json": {
      "status": "unsupported",
      "error": "GetPackage is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getPackageStatusAsync",
    "serviceRpc": "ledgerPackageServiceClient.getPackageStatus",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.ts#GetPackageStatusRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.ts#GetPackageStatusResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getPackageStatusAsync",
    "json": {
      "status": "unsupported",
      "error": "GetPackageStatus is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listVettedPackagesAsync",
    "serviceRpc": "ledgerPackageServiceClient.listVettedPackages",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.ts#ListVettedPackagesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.ts#ListVettedPackagesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listVettedPackagesAsync",
    "json": {
      "status": "unsupported",
      "error": "ListVettedPackages is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listParticipantPackagesAsync",
    "serviceRpc": "participantPackageServiceClient.listPackages",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#ListPackagesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#ListPackagesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listParticipantPackagesAsync",
    "json": {
      "status": "unsupported",
      "error": "ListParticipantPackages is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getParticipantPackageContentsAsync",
    "serviceRpc": "participantPackageServiceClient.getPackageContents",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#GetPackageContentsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#GetPackageContentsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getParticipantPackageContentsAsync",
    "json": {
      "status": "unsupported",
      "error": "GetParticipantPackageContents is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getParticipantPackageReferencesAsync",
    "serviceRpc": "participantPackageServiceClient.getPackageReferences",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#GetPackageReferencesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#GetPackageReferencesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getParticipantPackageReferencesAsync",
    "json": {
      "status": "unsupported",
      "error": "GetParticipantPackageReferences is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getParticipantDarAsync",
    "serviceRpc": "participantPackageServiceClient.getDar",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#GetDarRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#GetDarResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getParticipantDarAsync",
    "json": {
      "status": "unsupported",
      "error": "GetParticipantDar is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listParticipantDarsAsync",
    "serviceRpc": "participantPackageServiceClient.listDars",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#ListDarsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#ListDarsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listParticipantDarsAsync",
    "json": {
      "status": "unsupported",
      "error": "ListParticipantDars is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getParticipantDarContentsAsync",
    "serviceRpc": "participantPackageServiceClient.getDarContents",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#GetDarContentsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#GetDarContentsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getParticipantDarContentsAsync",
    "json": {
      "status": "unsupported",
      "error": "GetParticipantDarContents is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getParticipantStatusAsync",
    "serviceRpc": "participantStatusServiceClient.participantStatus",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_status_service.ts#ParticipantStatusRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_status_service.ts#ParticipantStatusResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getParticipantStatusAsync",
    "json": {
      "status": "unsupported",
      "error": "GetParticipantStatus is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "lookupOffsetByTimeAsync",
    "serviceRpc": "participantInspectionServiceClient.lookupOffsetByTime",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#LookupOffsetByTimeRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#LookupOffsetByTimeResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.lookupOffsetByTimeAsync",
    "json": {
      "status": "unsupported",
      "error": "LookupOffsetByTime is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "openCommitmentAsync",
    "serviceRpc": "participantInspectionServiceClient.openCommitment",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#OpenCommitmentRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#OpenCommitmentResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.openCommitmentAsync",
    "json": {
      "status": "unsupported",
      "error": "OpenCommitment is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "inspectCommitmentContractsAsync",
    "serviceRpc": "participantInspectionServiceClient.inspectCommitmentContracts",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#InspectCommitmentContractsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#InspectCommitmentContractsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.inspectCommitmentContractsAsync",
    "json": {
      "status": "unsupported",
      "error": "InspectCommitmentContracts is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "countInFlightAsync",
    "serviceRpc": "participantInspectionServiceClient.countInFlight",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#CountInFlightRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#CountInFlightResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.countInFlightAsync",
    "json": {
      "status": "unsupported",
      "error": "CountInFlight is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getConfigForSlowCounterParticipantsAsync",
    "serviceRpc": "participantInspectionServiceClient.getConfigForSlowCounterParticipants",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#GetConfigForSlowCounterParticipantsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#GetConfigForSlowCounterParticipantsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getConfigForSlowCounterParticipantsAsync",
    "json": {
      "status": "unsupported",
      "error": "GetConfigForSlowCounterParticipants is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getIntervalsBehindForCounterParticipantsAsync",
    "serviceRpc": "participantInspectionServiceClient.getIntervalsBehindForCounterParticipants",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#GetIntervalsBehindForCounterParticipantsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#GetIntervalsBehindForCounterParticipantsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getIntervalsBehindForCounterParticipantsAsync",
    "json": {
      "status": "unsupported",
      "error": "GetIntervalsBehindForCounterParticipants is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "lookupSentAcsCommitmentsAsync",
    "serviceRpc": "participantInspectionServiceClient.lookupSentAcsCommitments",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#LookupSentAcsCommitmentsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#LookupSentAcsCommitmentsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.lookupSentAcsCommitmentsAsync",
    "json": {
      "status": "unsupported",
      "error": "LookupSentAcsCommitments is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "lookupReceivedAcsCommitmentsAsync",
    "serviceRpc": "participantInspectionServiceClient.lookupReceivedAcsCommitments",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#LookupReceivedAcsCommitmentsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#LookupReceivedAcsCommitmentsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.lookupReceivedAcsCommitmentsAsync",
    "json": {
      "status": "unsupported",
      "error": "LookupReceivedAcsCommitments is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "addPartyAsync",
    "serviceRpc": "participantPartyManagementServiceClient.addPartyAsync",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.ts#AddPartyAsyncRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.ts#AddPartyAsyncResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.addPartyAsync",
    "json": {
      "status": "unsupported",
      "error": "AddParty is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "clearPartyOnboardingFlagAsync",
    "serviceRpc": "participantPartyManagementServiceClient.clearPartyOnboardingFlag",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.ts#ClearPartyOnboardingFlagRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.ts#ClearPartyOnboardingFlagResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.clearPartyOnboardingFlagAsync",
    "json": {
      "status": "unsupported",
      "error": "ClearPartyOnboardingFlag is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getHighestOffsetByTimestampAsync",
    "serviceRpc": "participantPartyManagementServiceClient.getHighestOffsetByTimestamp",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.ts#GetHighestOffsetByTimestampRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.ts#GetHighestOffsetByTimestampResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getHighestOffsetByTimestampAsync",
    "json": {
      "status": "unsupported",
      "error": "GetHighestOffsetByTimestamp is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getSafePruningOffsetAsync",
    "serviceRpc": "pruningServiceClient.getSafePruningOffset",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.ts#GetSafePruningOffsetRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.ts#GetSafePruningOffsetResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getSafePruningOffsetAsync",
    "json": {
      "status": "unsupported",
      "error": "GetSafePruningOffset is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getPruningScheduleAsync",
    "serviceRpc": "pruningServiceClient.getSchedule",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.ts#GetScheduleRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.ts#GetScheduleResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getPruningScheduleAsync",
    "json": {
      "status": "unsupported",
      "error": "GetPruningSchedule is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getParticipantPruningScheduleAsync",
    "serviceRpc": "pruningServiceClient.getParticipantSchedule",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.ts#GetParticipantScheduleRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.ts#GetParticipantScheduleResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getParticipantPruningScheduleAsync",
    "json": {
      "status": "unsupported",
      "error": "GetParticipantPruningSchedule is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getNoWaitCommitmentsFromAsync",
    "serviceRpc": "pruningServiceClient.getNoWaitCommitmentsFrom",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.ts#GetNoWaitCommitmentsFromRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.ts#GetNoWaitCommitmentsFromResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getNoWaitCommitmentsFromAsync",
    "json": {
      "status": "unsupported",
      "error": "GetNoWaitCommitmentsFrom is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "trafficControlStateAsync",
    "serviceRpc": "trafficControlServiceClient.trafficControlState",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/traffic_control_service.ts#TrafficControlStateRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/traffic_control_service.ts#TrafficControlStateResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.trafficControlStateAsync",
    "json": {
      "status": "unsupported",
      "error": "TrafficControlState is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listConnectedSynchronizersAsync",
    "serviceRpc": "synchronizerConnectivityServiceClient.listConnectedSynchronizers",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.ts#ListConnectedSynchronizersRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.ts#ListConnectedSynchronizersResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listConnectedSynchronizersAsync",
    "json": {
      "status": "unsupported",
      "error": "ListConnectedSynchronizers is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getSynchronizerIdAsync",
    "serviceRpc": "synchronizerConnectivityServiceClient.getSynchronizerId",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.ts#GetSynchronizerIdRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.ts#GetSynchronizerIdResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getSynchronizerIdAsync",
    "json": {
      "status": "unsupported",
      "error": "GetSynchronizerId is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listRegisteredSynchronizersAsync",
    "serviceRpc": "synchronizerConnectivityServiceClient.listRegisteredSynchronizers",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.ts#ListRegisteredSynchronizersRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.ts#ListRegisteredSynchronizersResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listRegisteredSynchronizersAsync",
    "json": {
      "status": "unsupported",
      "error": "ListRegisteredSynchronizers is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listPendingOperationsAsync",
    "serviceRpc": "participantRepairServiceClient.listPendingOperations",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_repair_service.ts#ListPendingOperationsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_repair_service.ts#ListPendingOperationsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listPendingOperationsAsync",
    "json": {
      "status": "unsupported",
      "error": "ListPendingOperations is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getResourceLimitsAsync",
    "serviceRpc": "resourceManagementServiceClient.getResourceLimits",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/resource_management_service.ts#GetResourceLimitsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/resource_management_service.ts#GetResourceLimitsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getResourceLimitsAsync",
    "json": {
      "status": "unsupported",
      "error": "GetResourceLimits is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getIdAsync",
    "serviceRpc": "identityInitializationServiceClient.getId",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.ts#GetIdRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.ts#GetIdResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getIdAsync",
    "json": {
      "status": "unsupported",
      "error": "GetId is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "currentTimeAsync",
    "serviceRpc": "identityInitializationServiceClient.currentTime",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.ts#CurrentTimeRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.ts#CurrentTimeResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.currentTimeAsync",
    "json": {
      "status": "unsupported",
      "error": "CurrentTime is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getContractAsync",
    "serviceRpc": "contractServiceClient.getContract",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/contract_service.ts#GetContractRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/contract_service.ts#GetContractResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getContractAsync",
    "json": {
      "status": "unsupported",
      "error": "GetContract is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getEventsByContractIdAsync",
    "serviceRpc": "eventQueryServiceClient.getEventsByContractId",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/event_query_service.ts#GetEventsByContractIdRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/event_query_service.ts#GetEventsByContractIdResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getEventsByContractIdAsync",
    "json": {
      "status": "unsupported",
      "error": "GetEventsByContractId is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listNamespaceDelegationAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listNamespaceDelegation",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListNamespaceDelegationRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListNamespaceDelegationResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listNamespaceDelegationAsync",
    "json": {
      "status": "unsupported",
      "error": "ListNamespaceDelegation is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listDecentralizedNamespaceDefinitionAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listDecentralizedNamespaceDefinition",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListDecentralizedNamespaceDefinitionRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListDecentralizedNamespaceDefinitionResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listDecentralizedNamespaceDefinitionAsync",
    "json": {
      "status": "unsupported",
      "error": "ListDecentralizedNamespaceDefinition is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listOwnerToKeyMappingAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listOwnerToKeyMapping",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListOwnerToKeyMappingRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListOwnerToKeyMappingResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listOwnerToKeyMappingAsync",
    "json": {
      "status": "unsupported",
      "error": "ListOwnerToKeyMapping is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listPartyToKeyMappingAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listPartyToKeyMapping",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListPartyToKeyMappingRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListPartyToKeyMappingResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listPartyToKeyMappingAsync",
    "json": {
      "status": "unsupported",
      "error": "ListPartyToKeyMapping is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listSynchronizerTrustCertificateAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listSynchronizerTrustCertificate",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListSynchronizerTrustCertificateRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListSynchronizerTrustCertificateResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listSynchronizerTrustCertificateAsync",
    "json": {
      "status": "unsupported",
      "error": "ListSynchronizerTrustCertificate is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listParticipantSynchronizerPermissionAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listParticipantSynchronizerPermission",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListParticipantSynchronizerPermissionRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListParticipantSynchronizerPermissionResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listParticipantSynchronizerPermissionAsync",
    "json": {
      "status": "unsupported",
      "error": "ListParticipantSynchronizerPermission is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "authorizeTopologyTransactionsAsync",
    "serviceRpc": "topologyManagerWriteServiceClient.authorize",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#AuthorizeRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#AuthorizeResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.authorizeTopologyTransactionsAsync",
    "json": {
      "status": "unsupported",
      "error": "AuthorizeTopologyTransactions is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "addTopologyTransactionsAsync",
    "serviceRpc": "topologyManagerWriteServiceClient.addTransactions",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#AddTransactionsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#AddTransactionsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.addTopologyTransactionsAsync",
    "json": {
      "status": "unsupported",
      "error": "AddTopologyTransactions is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "importTopologySnapshotAsync",
    "serviceRpc": "topologyManagerWriteServiceClient.importTopologySnapshot",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#ImportTopologySnapshotRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#ImportTopologySnapshotResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.importTopologySnapshotAsync",
    "json": {
      "status": "unsupported",
      "error": "ImportTopologySnapshot is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "importTopologySnapshotV2Async",
    "serviceRpc": "topologyManagerWriteServiceClient.importTopologySnapshotV2",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#ImportTopologySnapshotV2Request",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#ImportTopologySnapshotV2Response",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.importTopologySnapshotV2Async",
    "json": {
      "status": "unsupported",
      "error": "ImportTopologySnapshotV2 is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "signTopologyTransactionsAsync",
    "serviceRpc": "topologyManagerWriteServiceClient.signTransactions",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#SignTransactionsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#SignTransactionsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.signTopologyTransactionsAsync",
    "json": {
      "status": "unsupported",
      "error": "SignTopologyTransactions is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "generateTopologyTransactionsAsync",
    "serviceRpc": "topologyManagerWriteServiceClient.generateTransactions",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#GenerateTransactionsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#GenerateTransactionsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.generateTopologyTransactionsAsync",
    "json": {
      "status": "unsupported",
      "error": "GenerateTopologyTransactions is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "createTemporaryTopologyStoreAsync",
    "serviceRpc": "topologyManagerWriteServiceClient.createTemporaryTopologyStore",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#CreateTemporaryTopologyStoreRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#CreateTemporaryTopologyStoreResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.createTemporaryTopologyStoreAsync",
    "json": {
      "status": "unsupported",
      "error": "CreateTemporaryTopologyStore is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "dropTemporaryTopologyStoreAsync",
    "serviceRpc": "topologyManagerWriteServiceClient.dropTemporaryTopologyStore",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#DropTemporaryTopologyStoreRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#DropTemporaryTopologyStoreResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.dropTemporaryTopologyStoreAsync",
    "json": {
      "status": "unsupported",
      "error": "DropTemporaryTopologyStore is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listPartyHostingLimitsAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listPartyHostingLimits",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListPartyHostingLimitsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListPartyHostingLimitsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listPartyHostingLimitsAsync",
    "json": {
      "status": "unsupported",
      "error": "ListPartyHostingLimits is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "topologyListVettedPackagesAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listVettedPackages",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListVettedPackagesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListVettedPackagesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.topologyListVettedPackagesAsync",
    "json": {
      "status": "unsupported",
      "error": "TopologyListVettedPackages is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listPartyToParticipantAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listPartyToParticipant",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListPartyToParticipantRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListPartyToParticipantResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listPartyToParticipantAsync",
    "json": {
      "status": "unsupported",
      "error": "ListPartyToParticipant is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listSynchronizerParametersStateAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listSynchronizerParametersState",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListSynchronizerParametersStateRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListSynchronizerParametersStateResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listSynchronizerParametersStateAsync",
    "json": {
      "status": "unsupported",
      "error": "ListSynchronizerParametersState is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listSequencingParametersStateAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listSequencingParametersState",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListSequencingParametersStateRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListSequencingParametersStateResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listSequencingParametersStateAsync",
    "json": {
      "status": "unsupported",
      "error": "ListSequencingParametersState is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listMediatorSynchronizerStateAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listMediatorSynchronizerState",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListMediatorSynchronizerStateRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListMediatorSynchronizerStateResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listMediatorSynchronizerStateAsync",
    "json": {
      "status": "unsupported",
      "error": "ListMediatorSynchronizerState is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listSequencerSynchronizerStateAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listSequencerSynchronizerState",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListSequencerSynchronizerStateRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListSequencerSynchronizerStateResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listSequencerSynchronizerStateAsync",
    "json": {
      "status": "unsupported",
      "error": "ListSequencerSynchronizerState is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listLsuAnnouncementAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listLsuAnnouncement",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListLsuAnnouncementRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListLsuAnnouncementResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listLsuAnnouncementAsync",
    "json": {
      "status": "unsupported",
      "error": "ListLsuAnnouncement is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listLsuSequencerConnectionSuccessorAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listLsuSequencerConnectionSuccessor",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListLsuSequencerConnectionSuccessorRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListLsuSequencerConnectionSuccessorResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listLsuSequencerConnectionSuccessorAsync",
    "json": {
      "status": "unsupported",
      "error": "ListLsuSequencerConnectionSuccessor is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listAvailableStoresAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listAvailableStores",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListAvailableStoresRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListAvailableStoresResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listAvailableStoresAsync",
    "json": {
      "status": "unsupported",
      "error": "ListAvailableStores is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listAllAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listAll",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListAllRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListAllResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listAllAsync",
    "json": {
      "status": "unsupported",
      "error": "ListAll is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listAllV2Async",
    "serviceRpc": "topologyManagerReadServiceClient.listAllV2",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListAllV2Request",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListAllV2Response",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listAllV2Async",
    "json": {
      "status": "unsupported",
      "error": "ListAllV2 is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "topologyListPartiesAsync",
    "serviceRpc": "topologyAggregationServiceClient.listParties",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.ts#ListPartiesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.ts#ListPartiesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.topologyListPartiesAsync",
    "json": {
      "status": "unsupported",
      "error": "TopologyListParties is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "listKeyOwnersAsync",
    "serviceRpc": "topologyAggregationServiceClient.listKeyOwners",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.ts#ListKeyOwnersRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.ts#ListKeyOwnersResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listKeyOwnersAsync",
    "json": {
      "status": "unsupported",
      "error": "ListKeyOwners is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getActiveContractsPageAsync",
    "serviceRpc": "stateServiceClient.getActiveContractsPage",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.ts#GetActiveContractsPageRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.ts#GetActiveContractsPageResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.queryContractsAsync",
    "json": {
      "status": "unsupported",
      "error": "QueryContracts is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getConnectedSynchronizersAsync",
    "serviceRpc": "stateServiceClient.getConnectedSynchronizers",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.ts#GetConnectedSynchronizersRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.ts#GetConnectedSynchronizersResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getConnectedSynchronizersAsync",
    "json": {
      "status": "unsupported",
      "error": "GetConnectedSynchronizers is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getLedgerEndAsync",
    "serviceRpc": "stateServiceClient.getLedgerEnd",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.ts#GetLedgerEndRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.ts#GetLedgerEndResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getLedgerEndAsync",
    "json": {
      "status": "unsupported",
      "error": "GetLedgerEnd is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getLatestPrunedOffsetsAsync",
    "serviceRpc": "stateServiceClient.getLatestPrunedOffsets",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.ts#GetLatestPrunedOffsetsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.ts#GetLatestPrunedOffsetsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getLatestPrunedOffsetsAsync",
    "json": {
      "status": "unsupported",
      "error": "GetLatestPrunedOffsets is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getActiveContractsAsync",
    "serviceRpc": "GetActiveContracts service/RPC (see grpc-channel-factory)",
    "generatedRequest": "",
    "generatedResponse": "",
    "disposition": "high-level",
    "grpcOperation": "",
    "json": {
      "status": "supported",
      "endpoint": "/v1/stream/query",
      "projection": "explicit JsonTransport request projection",
      "reconstruction": "explicit JsonTransport response reconstruction"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getUpdatesAsync",
    "serviceRpc": "updateServiceClient.getUpdates",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdatesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getUpdatesAsync",
    "json": {
      "status": "unsupported",
      "error": "StreamTransactions is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getUpdateByOffsetAsync",
    "serviceRpc": "updateServiceClient.getUpdateByOffset",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdateByOffsetRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdateResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getUpdateByOffsetAsync",
    "json": {
      "status": "unsupported",
      "error": "GetUpdateByOffset is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getUpdateByIdAsync",
    "serviceRpc": "updateServiceClient.getUpdateById",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdateByIdRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdateResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getUpdateByIdAsync",
    "json": {
      "status": "unsupported",
      "error": "GetUpdateById is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getUpdateByHashAsync",
    "serviceRpc": "updateServiceClient.getUpdateByHash",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdateByHashRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdateResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getUpdateByHashAsync",
    "json": {
      "status": "unsupported",
      "error": "GetUpdateByHash is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getUpdatesPageAsync",
    "serviceRpc": "updateServiceClient.getUpdatesPage",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdatesPageRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdatesPageResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getUpdatesPageAsync",
    "json": {
      "status": "unsupported",
      "error": "GetUpdatesPage is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getCompletionsAsync",
    "serviceRpc": "commandCompletionServiceClient.getCompletions",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/command_completion_service.ts#GetCompletionsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/command_completion_service.ts#CompletionStreamResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getCompletionsAsync",
    "json": {
      "status": "unsupported",
      "error": "GetCompletions is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "submitCommandAsync",
    "serviceRpc": "SubmitCommand service/RPC (see grpc-channel-factory)",
    "generatedRequest": "generated.SubmitCommandRequest",
    "generatedResponse": "generated.SubmitCommandResponse",
    "disposition": "high-level",
    "grpcOperation": "GrpcOperations.submitCommandAsync",
    "json": {
      "status": "unsupported",
      "error": "SubmitCommand is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "submitCommandForTransactionAsync",
    "serviceRpc": "SubmitCommandForTransaction service/RPC (see grpc-channel-factory)",
    "generatedRequest": "generated.SubmitCommandForTransactionRequest",
    "generatedResponse": "generated.SubmitCommandForTransactionResponse",
    "disposition": "high-level",
    "grpcOperation": "GrpcOperations.submitCommandForTransactionAsync",
    "json": {
      "status": "unsupported",
      "error": "SubmitCommandForTransaction is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "prepareCommandAsync",
    "serviceRpc": "PrepareSubmission service/RPC (see grpc-channel-factory)",
    "generatedRequest": "generated.PrepareSubmissionRequest",
    "generatedResponse": "generated.PrepareSubmissionResponse",
    "disposition": "high-level",
    "grpcOperation": "GrpcOperations.prepareSubmissionAsync",
    "json": {
      "status": "unsupported",
      "error": "PrepareSubmission is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "executePreparedCommandAndWaitAsync",
    "serviceRpc": "ExecuteSubmissionAndWait service/RPC (see grpc-channel-factory)",
    "generatedRequest": "generated.ExecuteSubmissionAndWaitRequest",
    "generatedResponse": "generated.ExecuteSubmissionAndWaitResponse",
    "disposition": "high-level",
    "grpcOperation": "GrpcOperations.executeSubmissionAndWaitAsync",
    "json": {
      "status": "unsupported",
      "error": "ExecuteSubmissionAndWait is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "disposeAsync",
    "serviceRpc": "Dispose service/RPC (see grpc-channel-factory)",
    "generatedRequest": "generated.DisposeRequest",
    "generatedResponse": "generated.DisposeResponse",
    "disposition": "high-level",
    "grpcOperation": "GrpcOperations.disposeAsync",
    "json": {
      "status": "unsupported",
      "error": "Dispose is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "checkHealthAsync",
    "serviceRpc": "healthClient.check",
    "generatedRequest": "src/transports/grpc/generated/canton/google/grpc/health/v1/health.ts#HealthCheckRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/google/grpc/health/v1/health.ts#HealthCheckResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.checkHealthAsync",
    "json": {
      "status": "unsupported",
      "error": "CheckHealth is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getHealthAsync",
    "serviceRpc": "GetHealth service/RPC (see grpc-channel-factory)",
    "generatedRequest": "generated.GetHealthRequest",
    "generatedResponse": "generated.GetHealthResponse",
    "disposition": "removed",
    "grpcOperation": "GrpcOperations.getHealthAsync",
    "json": {
      "status": "supported",
      "endpoint": "/v2/version",
      "projection": "explicit JsonTransport request projection",
      "reconstruction": "explicit JsonTransport response reconstruction"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "createPartyAsync",
    "serviceRpc": "partyManagementServiceClient.allocateParty",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.ts#AllocatePartyRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.ts#AllocatePartyResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.createPartyAsync",
    "json": {
      "status": "supported",
      "endpoint": "/v2/parties",
      "projection": "explicit JsonTransport request projection",
      "reconstruction": "explicit JsonTransport response reconstruction"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listPartiesAsync",
    "serviceRpc": "partyManagementServiceClient.listKnownParties",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.ts#ListKnownPartiesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.ts#ListKnownPartiesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listPartiesAsync",
    "json": {
      "status": "supported",
      "endpoint": "/v2/parties",
      "projection": "explicit JsonTransport request projection",
      "reconstruction": "explicit JsonTransport response reconstruction"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "generateExternalPartyTopologyAsync",
    "serviceRpc": "GenerateExternalPartyTopology service/RPC (see grpc-channel-factory)",
    "generatedRequest": "generated.GenerateExternalPartyTopologyRequest",
    "generatedResponse": "generated.GenerateExternalPartyTopologyResponse",
    "disposition": "high-level",
    "grpcOperation": "GrpcOperations.generateExternalPartyTopologyAsync",
    "json": {
      "status": "unsupported",
      "error": "GenerateExternalPartyTopology is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "allocateExternalPartyAsync",
    "serviceRpc": "AllocateExternalParty service/RPC (see grpc-channel-factory)",
    "generatedRequest": "generated.AllocateExternalPartyRequest",
    "generatedResponse": "generated.AllocateExternalPartyResponse",
    "disposition": "high-level",
    "grpcOperation": "GrpcOperations.allocateExternalPartyAsync",
    "json": {
      "status": "unsupported",
      "error": "AllocateExternalParty is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getParticipantIdAsync",
    "serviceRpc": "partyManagementServiceClient.getParticipantId",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.ts#GetParticipantIdRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.ts#GetParticipantIdResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getParticipantIdAsync",
    "json": {
      "status": "unsupported",
      "error": "GetParticipantId is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getPartiesAsync",
    "serviceRpc": "partyManagementServiceClient.getParties",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.ts#GetPartiesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.ts#GetPartiesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getPartiesAsync",
    "json": {
      "status": "unsupported",
      "error": "GetParties is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "grantUserRightsAsync",
    "serviceRpc": "userManagementServiceClient.grantUserRights",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.ts#GrantUserRightsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.ts#GrantUserRightsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.grantUserRightsAsync",
    "json": {
      "status": "supported",
      "endpoint": "/v1/user/rights/grant",
      "projection": "explicit JsonTransport request projection",
      "reconstruction": "explicit JsonTransport response reconstruction"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getCommandStatusAsync",
    "serviceRpc": "commandInspectionServiceClient.getCommandStatus",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/command_inspection_service.ts#GetCommandStatusRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/command_inspection_service.ts#GetCommandStatusResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getCommandStatusAsync",
    "json": {
      "status": "unsupported",
      "error": "GetCommandStatus is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getUserAsync",
    "serviceRpc": "userManagementServiceClient.getUser",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.ts#GetUserRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.ts#GetUserResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getUserAsync",
    "json": {
      "status": "unsupported",
      "error": "GetUser is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listUsersAsync",
    "serviceRpc": "userManagementServiceClient.listUsers",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.ts#ListUsersRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.ts#ListUsersResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listUsersAsync",
    "json": {
      "status": "unsupported",
      "error": "ListUsers is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listUserRightsAsync",
    "serviceRpc": "userManagementServiceClient.listUserRights",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.ts#ListUserRightsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.ts#ListUserRightsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listUserRightsAsync",
    "json": {
      "status": "unsupported",
      "error": "ListUserRights is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "uploadPackageAsync",
    "serviceRpc": "packageManagementServiceClient.uploadDarFile",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.ts#UploadDarFileRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.ts#UploadDarFileResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.uploadPackageAsync",
    "json": {
      "status": "supported",
      "endpoint": "/v1/packages",
      "projection": "explicit JsonTransport request projection",
      "reconstruction": "explicit JsonTransport response reconstruction"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listKnownPackagesAsync",
    "serviceRpc": "packageManagementServiceClient.listKnownPackages",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.ts#ListKnownPackagesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.ts#ListKnownPackagesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listKnownPackagesAsync",
    "json": {
      "status": "unsupported",
      "error": "ListKnownPackages is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getIdentityProviderConfigAsync",
    "serviceRpc": "identityProviderConfigServiceClient.getIdentityProviderConfig",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/identity_provider_config_service.ts#GetIdentityProviderConfigRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/identity_provider_config_service.ts#GetIdentityProviderConfigResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getIdentityProviderConfigAsync",
    "json": {
      "status": "unsupported",
      "error": "GetIdentityProviderConfig is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listIdentityProviderConfigsAsync",
    "serviceRpc": "identityProviderConfigServiceClient.listIdentityProviderConfigs",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/identity_provider_config_service.ts#ListIdentityProviderConfigsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/identity_provider_config_service.ts#ListIdentityProviderConfigsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listIdentityProviderConfigsAsync",
    "json": {
      "status": "unsupported",
      "error": "ListIdentityProviderConfigs is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listPackagesAsync",
    "serviceRpc": "ledgerPackageServiceClient.listPackages",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.ts#ListPackagesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.ts#ListPackagesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listPackagesAsync",
    "json": {
      "status": "unsupported",
      "error": "ListPackages is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getPackageAsync",
    "serviceRpc": "ledgerPackageServiceClient.getPackage",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.ts#GetPackageRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.ts#GetPackageResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getPackageAsync",
    "json": {
      "status": "unsupported",
      "error": "GetPackage is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getPackageStatusAsync",
    "serviceRpc": "ledgerPackageServiceClient.getPackageStatus",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.ts#GetPackageStatusRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.ts#GetPackageStatusResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getPackageStatusAsync",
    "json": {
      "status": "unsupported",
      "error": "GetPackageStatus is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listVettedPackagesAsync",
    "serviceRpc": "ledgerPackageServiceClient.listVettedPackages",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.ts#ListVettedPackagesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.ts#ListVettedPackagesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listVettedPackagesAsync",
    "json": {
      "status": "unsupported",
      "error": "ListVettedPackages is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listParticipantPackagesAsync",
    "serviceRpc": "participantPackageServiceClient.listPackages",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#ListPackagesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#ListPackagesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listParticipantPackagesAsync",
    "json": {
      "status": "unsupported",
      "error": "ListParticipantPackages is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getParticipantPackageContentsAsync",
    "serviceRpc": "participantPackageServiceClient.getPackageContents",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#GetPackageContentsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#GetPackageContentsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getParticipantPackageContentsAsync",
    "json": {
      "status": "unsupported",
      "error": "GetParticipantPackageContents is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getParticipantPackageReferencesAsync",
    "serviceRpc": "participantPackageServiceClient.getPackageReferences",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#GetPackageReferencesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#GetPackageReferencesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getParticipantPackageReferencesAsync",
    "json": {
      "status": "unsupported",
      "error": "GetParticipantPackageReferences is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getParticipantDarAsync",
    "serviceRpc": "participantPackageServiceClient.getDar",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#GetDarRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#GetDarResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getParticipantDarAsync",
    "json": {
      "status": "unsupported",
      "error": "GetParticipantDar is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listParticipantDarsAsync",
    "serviceRpc": "participantPackageServiceClient.listDars",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#ListDarsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#ListDarsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listParticipantDarsAsync",
    "json": {
      "status": "unsupported",
      "error": "ListParticipantDars is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getParticipantDarContentsAsync",
    "serviceRpc": "participantPackageServiceClient.getDarContents",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#GetDarContentsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.ts#GetDarContentsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getParticipantDarContentsAsync",
    "json": {
      "status": "unsupported",
      "error": "GetParticipantDarContents is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getParticipantStatusAsync",
    "serviceRpc": "participantStatusServiceClient.participantStatus",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_status_service.ts#ParticipantStatusRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_status_service.ts#ParticipantStatusResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getParticipantStatusAsync",
    "json": {
      "status": "unsupported",
      "error": "GetParticipantStatus is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "lookupOffsetByTimeAsync",
    "serviceRpc": "participantInspectionServiceClient.lookupOffsetByTime",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#LookupOffsetByTimeRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#LookupOffsetByTimeResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.lookupOffsetByTimeAsync",
    "json": {
      "status": "unsupported",
      "error": "LookupOffsetByTime is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "openCommitmentAsync",
    "serviceRpc": "participantInspectionServiceClient.openCommitment",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#OpenCommitmentRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#OpenCommitmentResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.openCommitmentAsync",
    "json": {
      "status": "unsupported",
      "error": "OpenCommitment is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "inspectCommitmentContractsAsync",
    "serviceRpc": "participantInspectionServiceClient.inspectCommitmentContracts",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#InspectCommitmentContractsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#InspectCommitmentContractsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.inspectCommitmentContractsAsync",
    "json": {
      "status": "unsupported",
      "error": "InspectCommitmentContracts is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "countInFlightAsync",
    "serviceRpc": "participantInspectionServiceClient.countInFlight",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#CountInFlightRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#CountInFlightResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.countInFlightAsync",
    "json": {
      "status": "unsupported",
      "error": "CountInFlight is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getConfigForSlowCounterParticipantsAsync",
    "serviceRpc": "participantInspectionServiceClient.getConfigForSlowCounterParticipants",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#GetConfigForSlowCounterParticipantsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#GetConfigForSlowCounterParticipantsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getConfigForSlowCounterParticipantsAsync",
    "json": {
      "status": "unsupported",
      "error": "GetConfigForSlowCounterParticipants is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getIntervalsBehindForCounterParticipantsAsync",
    "serviceRpc": "participantInspectionServiceClient.getIntervalsBehindForCounterParticipants",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#GetIntervalsBehindForCounterParticipantsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#GetIntervalsBehindForCounterParticipantsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getIntervalsBehindForCounterParticipantsAsync",
    "json": {
      "status": "unsupported",
      "error": "GetIntervalsBehindForCounterParticipants is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "lookupSentAcsCommitmentsAsync",
    "serviceRpc": "participantInspectionServiceClient.lookupSentAcsCommitments",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#LookupSentAcsCommitmentsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#LookupSentAcsCommitmentsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.lookupSentAcsCommitmentsAsync",
    "json": {
      "status": "unsupported",
      "error": "LookupSentAcsCommitments is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "lookupReceivedAcsCommitmentsAsync",
    "serviceRpc": "participantInspectionServiceClient.lookupReceivedAcsCommitments",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#LookupReceivedAcsCommitmentsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.ts#LookupReceivedAcsCommitmentsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.lookupReceivedAcsCommitmentsAsync",
    "json": {
      "status": "unsupported",
      "error": "LookupReceivedAcsCommitments is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "addPartyAsync",
    "serviceRpc": "participantPartyManagementServiceClient.addPartyAsync",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.ts#AddPartyAsyncRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.ts#AddPartyAsyncResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.addPartyAsync",
    "json": {
      "status": "unsupported",
      "error": "AddParty is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "clearPartyOnboardingFlagAsync",
    "serviceRpc": "participantPartyManagementServiceClient.clearPartyOnboardingFlag",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.ts#ClearPartyOnboardingFlagRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.ts#ClearPartyOnboardingFlagResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.clearPartyOnboardingFlagAsync",
    "json": {
      "status": "unsupported",
      "error": "ClearPartyOnboardingFlag is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getHighestOffsetByTimestampAsync",
    "serviceRpc": "participantPartyManagementServiceClient.getHighestOffsetByTimestamp",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.ts#GetHighestOffsetByTimestampRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.ts#GetHighestOffsetByTimestampResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getHighestOffsetByTimestampAsync",
    "json": {
      "status": "unsupported",
      "error": "GetHighestOffsetByTimestamp is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getSafePruningOffsetAsync",
    "serviceRpc": "pruningServiceClient.getSafePruningOffset",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.ts#GetSafePruningOffsetRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.ts#GetSafePruningOffsetResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getSafePruningOffsetAsync",
    "json": {
      "status": "unsupported",
      "error": "GetSafePruningOffset is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getPruningScheduleAsync",
    "serviceRpc": "pruningServiceClient.getSchedule",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.ts#GetScheduleRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.ts#GetScheduleResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getPruningScheduleAsync",
    "json": {
      "status": "unsupported",
      "error": "GetPruningSchedule is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getParticipantPruningScheduleAsync",
    "serviceRpc": "pruningServiceClient.getParticipantSchedule",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.ts#GetParticipantScheduleRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.ts#GetParticipantScheduleResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getParticipantPruningScheduleAsync",
    "json": {
      "status": "unsupported",
      "error": "GetParticipantPruningSchedule is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getNoWaitCommitmentsFromAsync",
    "serviceRpc": "pruningServiceClient.getNoWaitCommitmentsFrom",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.ts#GetNoWaitCommitmentsFromRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.ts#GetNoWaitCommitmentsFromResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getNoWaitCommitmentsFromAsync",
    "json": {
      "status": "unsupported",
      "error": "GetNoWaitCommitmentsFrom is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "trafficControlStateAsync",
    "serviceRpc": "trafficControlServiceClient.trafficControlState",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/traffic_control_service.ts#TrafficControlStateRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/traffic_control_service.ts#TrafficControlStateResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.trafficControlStateAsync",
    "json": {
      "status": "unsupported",
      "error": "TrafficControlState is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listConnectedSynchronizersAsync",
    "serviceRpc": "synchronizerConnectivityServiceClient.listConnectedSynchronizers",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.ts#ListConnectedSynchronizersRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.ts#ListConnectedSynchronizersResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listConnectedSynchronizersAsync",
    "json": {
      "status": "unsupported",
      "error": "ListConnectedSynchronizers is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getSynchronizerIdAsync",
    "serviceRpc": "synchronizerConnectivityServiceClient.getSynchronizerId",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.ts#GetSynchronizerIdRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.ts#GetSynchronizerIdResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getSynchronizerIdAsync",
    "json": {
      "status": "unsupported",
      "error": "GetSynchronizerId is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listRegisteredSynchronizersAsync",
    "serviceRpc": "synchronizerConnectivityServiceClient.listRegisteredSynchronizers",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.ts#ListRegisteredSynchronizersRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.ts#ListRegisteredSynchronizersResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listRegisteredSynchronizersAsync",
    "json": {
      "status": "unsupported",
      "error": "ListRegisteredSynchronizers is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listPendingOperationsAsync",
    "serviceRpc": "participantRepairServiceClient.listPendingOperations",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_repair_service.ts#ListPendingOperationsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_repair_service.ts#ListPendingOperationsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listPendingOperationsAsync",
    "json": {
      "status": "unsupported",
      "error": "ListPendingOperations is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getResourceLimitsAsync",
    "serviceRpc": "resourceManagementServiceClient.getResourceLimits",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/resource_management_service.ts#GetResourceLimitsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/resource_management_service.ts#GetResourceLimitsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getResourceLimitsAsync",
    "json": {
      "status": "unsupported",
      "error": "GetResourceLimits is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getIdAsync",
    "serviceRpc": "identityInitializationServiceClient.getId",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.ts#GetIdRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.ts#GetIdResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getIdAsync",
    "json": {
      "status": "unsupported",
      "error": "GetId is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "currentTimeAsync",
    "serviceRpc": "identityInitializationServiceClient.currentTime",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.ts#CurrentTimeRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.ts#CurrentTimeResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.currentTimeAsync",
    "json": {
      "status": "unsupported",
      "error": "CurrentTime is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listNamespaceDelegationAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listNamespaceDelegation",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListNamespaceDelegationRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListNamespaceDelegationResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listNamespaceDelegationAsync",
    "json": {
      "status": "unsupported",
      "error": "ListNamespaceDelegation is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listDecentralizedNamespaceDefinitionAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listDecentralizedNamespaceDefinition",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListDecentralizedNamespaceDefinitionRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListDecentralizedNamespaceDefinitionResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listDecentralizedNamespaceDefinitionAsync",
    "json": {
      "status": "unsupported",
      "error": "ListDecentralizedNamespaceDefinition is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listOwnerToKeyMappingAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listOwnerToKeyMapping",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListOwnerToKeyMappingRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListOwnerToKeyMappingResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listOwnerToKeyMappingAsync",
    "json": {
      "status": "unsupported",
      "error": "ListOwnerToKeyMapping is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listPartyToKeyMappingAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listPartyToKeyMapping",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListPartyToKeyMappingRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListPartyToKeyMappingResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listPartyToKeyMappingAsync",
    "json": {
      "status": "unsupported",
      "error": "ListPartyToKeyMapping is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listSynchronizerTrustCertificateAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listSynchronizerTrustCertificate",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListSynchronizerTrustCertificateRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListSynchronizerTrustCertificateResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listSynchronizerTrustCertificateAsync",
    "json": {
      "status": "unsupported",
      "error": "ListSynchronizerTrustCertificate is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listParticipantSynchronizerPermissionAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listParticipantSynchronizerPermission",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListParticipantSynchronizerPermissionRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListParticipantSynchronizerPermissionResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listParticipantSynchronizerPermissionAsync",
    "json": {
      "status": "unsupported",
      "error": "ListParticipantSynchronizerPermission is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "authorizeTopologyTransactionsAsync",
    "serviceRpc": "topologyManagerWriteServiceClient.authorize",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#AuthorizeRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#AuthorizeResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.authorizeTopologyTransactionsAsync",
    "json": {
      "status": "unsupported",
      "error": "AuthorizeTopologyTransactions is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "addTopologyTransactionsAsync",
    "serviceRpc": "topologyManagerWriteServiceClient.addTransactions",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#AddTransactionsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#AddTransactionsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.addTopologyTransactionsAsync",
    "json": {
      "status": "unsupported",
      "error": "AddTopologyTransactions is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "importTopologySnapshotAsync",
    "serviceRpc": "topologyManagerWriteServiceClient.importTopologySnapshot",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#ImportTopologySnapshotRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#ImportTopologySnapshotResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.importTopologySnapshotAsync",
    "json": {
      "status": "unsupported",
      "error": "ImportTopologySnapshot is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "importTopologySnapshotV2Async",
    "serviceRpc": "topologyManagerWriteServiceClient.importTopologySnapshotV2",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#ImportTopologySnapshotV2Request",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#ImportTopologySnapshotV2Response",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.importTopologySnapshotV2Async",
    "json": {
      "status": "unsupported",
      "error": "ImportTopologySnapshotV2 is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "signTopologyTransactionsAsync",
    "serviceRpc": "topologyManagerWriteServiceClient.signTransactions",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#SignTransactionsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#SignTransactionsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.signTopologyTransactionsAsync",
    "json": {
      "status": "unsupported",
      "error": "SignTopologyTransactions is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "generateTopologyTransactionsAsync",
    "serviceRpc": "topologyManagerWriteServiceClient.generateTransactions",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#GenerateTransactionsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#GenerateTransactionsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.generateTopologyTransactionsAsync",
    "json": {
      "status": "unsupported",
      "error": "GenerateTopologyTransactions is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "createTemporaryTopologyStoreAsync",
    "serviceRpc": "topologyManagerWriteServiceClient.createTemporaryTopologyStore",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#CreateTemporaryTopologyStoreRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#CreateTemporaryTopologyStoreResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.createTemporaryTopologyStoreAsync",
    "json": {
      "status": "unsupported",
      "error": "CreateTemporaryTopologyStore is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "dropTemporaryTopologyStoreAsync",
    "serviceRpc": "topologyManagerWriteServiceClient.dropTemporaryTopologyStore",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#DropTemporaryTopologyStoreRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.ts#DropTemporaryTopologyStoreResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.dropTemporaryTopologyStoreAsync",
    "json": {
      "status": "unsupported",
      "error": "DropTemporaryTopologyStore is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listPartyHostingLimitsAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listPartyHostingLimits",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListPartyHostingLimitsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListPartyHostingLimitsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listPartyHostingLimitsAsync",
    "json": {
      "status": "unsupported",
      "error": "ListPartyHostingLimits is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "topologyListVettedPackagesAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listVettedPackages",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListVettedPackagesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListVettedPackagesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.topologyListVettedPackagesAsync",
    "json": {
      "status": "unsupported",
      "error": "TopologyListVettedPackages is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listPartyToParticipantAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listPartyToParticipant",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListPartyToParticipantRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListPartyToParticipantResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listPartyToParticipantAsync",
    "json": {
      "status": "unsupported",
      "error": "ListPartyToParticipant is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listSynchronizerParametersStateAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listSynchronizerParametersState",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListSynchronizerParametersStateRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListSynchronizerParametersStateResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listSynchronizerParametersStateAsync",
    "json": {
      "status": "unsupported",
      "error": "ListSynchronizerParametersState is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listSequencingParametersStateAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listSequencingParametersState",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListSequencingParametersStateRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListSequencingParametersStateResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listSequencingParametersStateAsync",
    "json": {
      "status": "unsupported",
      "error": "ListSequencingParametersState is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listMediatorSynchronizerStateAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listMediatorSynchronizerState",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListMediatorSynchronizerStateRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListMediatorSynchronizerStateResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listMediatorSynchronizerStateAsync",
    "json": {
      "status": "unsupported",
      "error": "ListMediatorSynchronizerState is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listSequencerSynchronizerStateAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listSequencerSynchronizerState",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListSequencerSynchronizerStateRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListSequencerSynchronizerStateResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listSequencerSynchronizerStateAsync",
    "json": {
      "status": "unsupported",
      "error": "ListSequencerSynchronizerState is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listLsuAnnouncementAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listLsuAnnouncement",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListLsuAnnouncementRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListLsuAnnouncementResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listLsuAnnouncementAsync",
    "json": {
      "status": "unsupported",
      "error": "ListLsuAnnouncement is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listLsuSequencerConnectionSuccessorAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listLsuSequencerConnectionSuccessor",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListLsuSequencerConnectionSuccessorRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListLsuSequencerConnectionSuccessorResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listLsuSequencerConnectionSuccessorAsync",
    "json": {
      "status": "unsupported",
      "error": "ListLsuSequencerConnectionSuccessor is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listAvailableStoresAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listAvailableStores",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListAvailableStoresRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListAvailableStoresResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listAvailableStoresAsync",
    "json": {
      "status": "unsupported",
      "error": "ListAvailableStores is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listAllAsync",
    "serviceRpc": "topologyManagerReadServiceClient.listAll",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListAllRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListAllResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listAllAsync",
    "json": {
      "status": "unsupported",
      "error": "ListAll is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listAllV2Async",
    "serviceRpc": "topologyManagerReadServiceClient.listAllV2",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListAllV2Request",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.ts#ListAllV2Response",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listAllV2Async",
    "json": {
      "status": "unsupported",
      "error": "ListAllV2 is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "topologyListPartiesAsync",
    "serviceRpc": "topologyAggregationServiceClient.listParties",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.ts#ListPartiesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.ts#ListPartiesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.topologyListPartiesAsync",
    "json": {
      "status": "unsupported",
      "error": "TopologyListParties is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "listKeyOwnersAsync",
    "serviceRpc": "topologyAggregationServiceClient.listKeyOwners",
    "generatedRequest": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.ts#ListKeyOwnersRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.ts#ListKeyOwnersResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.listKeyOwnersAsync",
    "json": {
      "status": "unsupported",
      "error": "ListKeyOwners is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getContractAsync",
    "serviceRpc": "contractServiceClient.getContract",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/contract_service.ts#GetContractRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/contract_service.ts#GetContractResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getContractAsync",
    "json": {
      "status": "unsupported",
      "error": "GetContract is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getEventsByContractIdAsync",
    "serviceRpc": "eventQueryServiceClient.getEventsByContractId",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/event_query_service.ts#GetEventsByContractIdRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/event_query_service.ts#GetEventsByContractIdResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getEventsByContractIdAsync",
    "json": {
      "status": "unsupported",
      "error": "GetEventsByContractId is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "queryContractsAsync",
    "serviceRpc": "stateServiceClient.getActiveContractsPage",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.ts#GetActiveContractsPageRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.ts#GetActiveContractsPageResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.queryContractsAsync",
    "json": {
      "status": "unsupported",
      "error": "QueryContracts is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getConnectedSynchronizersAsync",
    "serviceRpc": "stateServiceClient.getConnectedSynchronizers",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.ts#GetConnectedSynchronizersRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.ts#GetConnectedSynchronizersResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getConnectedSynchronizersAsync",
    "json": {
      "status": "unsupported",
      "error": "GetConnectedSynchronizers is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getLedgerEndAsync",
    "serviceRpc": "stateServiceClient.getLedgerEnd",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.ts#GetLedgerEndRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.ts#GetLedgerEndResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getLedgerEndAsync",
    "json": {
      "status": "unsupported",
      "error": "GetLedgerEnd is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getLatestPrunedOffsetsAsync",
    "serviceRpc": "stateServiceClient.getLatestPrunedOffsets",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.ts#GetLatestPrunedOffsetsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.ts#GetLatestPrunedOffsetsResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getLatestPrunedOffsetsAsync",
    "json": {
      "status": "unsupported",
      "error": "GetLatestPrunedOffsets is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getUpdatesAsync",
    "serviceRpc": "updateServiceClient.getUpdates",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdatesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getUpdatesAsync",
    "json": {
      "status": "unsupported",
      "error": "StreamTransactions is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getUpdateByOffsetAsync",
    "serviceRpc": "updateServiceClient.getUpdateByOffset",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdateByOffsetRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdateResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getUpdateByOffsetAsync",
    "json": {
      "status": "unsupported",
      "error": "GetUpdateByOffset is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getUpdateByIdAsync",
    "serviceRpc": "updateServiceClient.getUpdateById",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdateByIdRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdateResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getUpdateByIdAsync",
    "json": {
      "status": "unsupported",
      "error": "GetUpdateById is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getUpdateByHashAsync",
    "serviceRpc": "updateServiceClient.getUpdateByHash",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdateByHashRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdateResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getUpdateByHashAsync",
    "json": {
      "status": "unsupported",
      "error": "GetUpdateByHash is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getUpdatesPageAsync",
    "serviceRpc": "updateServiceClient.getUpdatesPage",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdatesPageRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.ts#GetUpdatesPageResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getUpdatesPageAsync",
    "json": {
      "status": "unsupported",
      "error": "GetUpdatesPage is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getCompletionsAsync",
    "serviceRpc": "commandCompletionServiceClient.getCompletions",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/command_completion_service.ts#GetCompletionsRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/command_completion_service.ts#CompletionStreamResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.getCompletionsAsync",
    "json": {
      "status": "unsupported",
      "error": "GetCompletions is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "prepareSubmissionAsync",
    "serviceRpc": "PrepareSubmission service/RPC (see grpc-channel-factory)",
    "generatedRequest": "generated.PrepareSubmissionRequest",
    "generatedResponse": "generated.PrepareSubmissionResponse",
    "disposition": "high-level",
    "grpcOperation": "GrpcOperations.prepareSubmissionAsync",
    "json": {
      "status": "unsupported",
      "error": "PrepareSubmission is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "executeSubmissionAndWaitAsync",
    "serviceRpc": "ExecuteSubmissionAndWait service/RPC (see grpc-channel-factory)",
    "generatedRequest": "generated.ExecuteSubmissionAndWaitRequest",
    "generatedResponse": "generated.ExecuteSubmissionAndWaitResponse",
    "disposition": "high-level",
    "grpcOperation": "GrpcOperations.executeSubmissionAndWaitAsync",
    "json": {
      "status": "unsupported",
      "error": "ExecuteSubmissionAndWait is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "submitCommandAsync",
    "serviceRpc": "SubmitCommand service/RPC (see grpc-channel-factory)",
    "generatedRequest": "generated.SubmitCommandRequest",
    "generatedResponse": "generated.SubmitCommandResponse",
    "disposition": "high-level",
    "grpcOperation": "GrpcOperations.submitCommandAsync",
    "json": {
      "status": "unsupported",
      "error": "SubmitCommand is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "submitCommandForTransactionAsync",
    "serviceRpc": "SubmitCommandForTransaction service/RPC (see grpc-channel-factory)",
    "generatedRequest": "generated.SubmitCommandForTransactionRequest",
    "generatedResponse": "generated.SubmitCommandForTransactionResponse",
    "disposition": "high-level",
    "grpcOperation": "GrpcOperations.submitCommandForTransactionAsync",
    "json": {
      "status": "unsupported",
      "error": "SubmitCommandForTransaction is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  }
]
```
