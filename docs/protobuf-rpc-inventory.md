# Protobuf RPC disposition inventory

This is the migration source of truth for every declared public transport and gRPC operation. It is enforced by `tests/unit/public/protobuf-rpc-inventory.test.ts` against the two interfaces.

`direct-rpc` entries migrate to the recorded generated request and unary/stream response. `high-level` retains SDK workflows (lifecycle, interactive signing/preparation, command coordination, decentralized-party allocation, and the JSON-only active-contract observer stream). `removed` is a legacy internal alias. JSON capability is deliberately independent from that public disposition.

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
    "serviceRpc": "GetHealth service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "CheckHealth service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "CreateParty service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListParties service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetParticipantId service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetParties service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GrantUserRights service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetCommandStatus service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetUser service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListUsers service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListUserRights service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "UploadPackage service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListKnownPackages service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetIdentityProviderConfig service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListIdentityProviderConfigs service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListPackages service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetPackage service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetPackageStatus service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListVettedPackages service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListParticipantPackages service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetParticipantPackageContents service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetParticipantPackageReferences service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetParticipantDar service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListParticipantDars service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetParticipantDarContents service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetParticipantStatus service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "LookupOffsetByTime service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "OpenCommitment service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "InspectCommitmentContracts service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "CountInFlight service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetConfigForSlowCounterParticipants service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetIntervalsBehindForCounterParticipants service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "LookupSentAcsCommitments service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "LookupReceivedAcsCommitments service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "AddParty service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ClearPartyOnboardingFlag service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetHighestOffsetByTimestamp service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetSafePruningOffset service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetPruningSchedule service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetParticipantPruningSchedule service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetNoWaitCommitmentsFrom service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "TrafficControlState service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListConnectedSynchronizers service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetSynchronizerId service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListRegisteredSynchronizers service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListPendingOperations service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetResourceLimits service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetId service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "CurrentTime service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetContract service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetEventsByContractId service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListNamespaceDelegation service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListDecentralizedNamespaceDefinition service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListOwnerToKeyMapping service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListPartyToKeyMapping service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListSynchronizerTrustCertificate service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListParticipantSynchronizerPermission service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "AuthorizeTopologyTransactions service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "AddTopologyTransactions service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ImportTopologySnapshot service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ImportTopologySnapshotV2 service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "SignTopologyTransactions service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GenerateTopologyTransactions service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "CreateTemporaryTopologyStore service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "DropTemporaryTopologyStore service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListPartyHostingLimits service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "TopologyListVettedPackages service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListPartyToParticipant service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListSynchronizerParametersState service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListSequencingParametersState service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListMediatorSynchronizerState service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListSequencerSynchronizerState service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListLsuAnnouncement service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListLsuSequencerConnectionSuccessor service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListAvailableStores service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListAll service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListAllV2 service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "TopologyListParties service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListKeyOwners service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "QueryContracts service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetConnectedSynchronizers service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetLedgerEnd service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetLatestPrunedOffsets service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "StreamTransactions service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.streamTransactionsAsync",
    "json": {
      "status": "unsupported",
      "error": "StreamTransactions is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "ITransport",
    "method": "getUpdateByOffsetAsync",
    "serviceRpc": "GetUpdateByOffset service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdateByOffsetRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdateResponse",
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
    "serviceRpc": "GetUpdateById service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdateByIdRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdateResponse",
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
    "serviceRpc": "GetUpdateByHash service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdateByHashRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdateResponse",
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
    "serviceRpc": "GetUpdatesPage service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesPageRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesPageResponse",
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
    "serviceRpc": "GetCompletions service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "CheckHealth service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "CreateParty service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListParties service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetParticipantId service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetParties service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GrantUserRights service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetCommandStatus service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetUser service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListUsers service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListUserRights service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "UploadPackage service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListKnownPackages service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetIdentityProviderConfig service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListIdentityProviderConfigs service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListPackages service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetPackage service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetPackageStatus service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListVettedPackages service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListParticipantPackages service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetParticipantPackageContents service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetParticipantPackageReferences service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetParticipantDar service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListParticipantDars service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetParticipantDarContents service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetParticipantStatus service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "LookupOffsetByTime service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "OpenCommitment service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "InspectCommitmentContracts service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "CountInFlight service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetConfigForSlowCounterParticipants service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetIntervalsBehindForCounterParticipants service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "LookupSentAcsCommitments service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "LookupReceivedAcsCommitments service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "AddParty service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ClearPartyOnboardingFlag service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetHighestOffsetByTimestamp service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetSafePruningOffset service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetPruningSchedule service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetParticipantPruningSchedule service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetNoWaitCommitmentsFrom service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "TrafficControlState service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListConnectedSynchronizers service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetSynchronizerId service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListRegisteredSynchronizers service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListPendingOperations service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetResourceLimits service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetId service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "CurrentTime service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListNamespaceDelegation service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListDecentralizedNamespaceDefinition service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListOwnerToKeyMapping service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListPartyToKeyMapping service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListSynchronizerTrustCertificate service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListParticipantSynchronizerPermission service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "AuthorizeTopologyTransactions service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "AddTopologyTransactions service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ImportTopologySnapshot service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ImportTopologySnapshotV2 service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "SignTopologyTransactions service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GenerateTopologyTransactions service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "CreateTemporaryTopologyStore service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "DropTemporaryTopologyStore service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListPartyHostingLimits service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "TopologyListVettedPackages service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListPartyToParticipant service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListSynchronizerParametersState service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListSequencingParametersState service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListMediatorSynchronizerState service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListSequencerSynchronizerState service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListLsuAnnouncement service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListLsuSequencerConnectionSuccessor service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListAvailableStores service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListAll service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListAllV2 service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "TopologyListParties service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "ListKeyOwners service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetContract service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetEventsByContractId service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "QueryContracts service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetConnectedSynchronizers service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetLedgerEnd service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "serviceRpc": "GetLatestPrunedOffsets service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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
    "method": "streamTransactionsAsync",
    "serviceRpc": "StreamTransactions service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
    "disposition": "direct-rpc",
    "grpcOperation": "GrpcOperations.streamTransactionsAsync",
    "json": {
      "status": "unsupported",
      "error": "StreamTransactions is not supported by json transport"
    },
    "testPath": "tests/unit/public/protobuf-rpc-inventory.test.ts"
  },
  {
    "surface": "GrpcOperations",
    "method": "getUpdateByOffsetAsync",
    "serviceRpc": "GetUpdateByOffset service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdateByOffsetRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdateResponse",
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
    "serviceRpc": "GetUpdateById service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdateByIdRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdateResponse",
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
    "serviceRpc": "GetUpdateByHash service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdateByHashRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdateResponse",
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
    "serviceRpc": "GetUpdatesPage service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesPageRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesPageResponse",
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
    "serviceRpc": "GetCompletions service/RPC (see grpc-channel-factory)",
    "generatedRequest": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesRequest",
    "generatedResponse": "src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js#GetUpdatesResponse",
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

