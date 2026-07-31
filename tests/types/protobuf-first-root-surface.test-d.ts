import * as sdk from "@distrohelena/canton-typescript-sdk";
import { comDaml } from "@distrohelena/canton-typescript-sdk/protobuf";

const generated = comDaml.ledger.api.v2.VersionService;
void generated;

// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.GetLedgerApiVersionResponse;
// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.HealthCheckRequest;
// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.GetParticipantStatusRequest;
// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.GetParticipantIdRequest;
// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.GetPackageReferencesRequest;
// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.HealthCheckResponse;
// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.GetLedgerApiVersionRequest;
// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.GetParticipantStatusResponse;
// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.GetParticipantIdResponse;
// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.GetPackageReferencesResponse;
// @ts-expect-error generated RPC enums are not root SDK enums
sdk.HealthCheckStatus;
