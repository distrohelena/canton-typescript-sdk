import {
    TopologyAggregationServiceClient,
    WaitForPartyHostingRequest,
} from "@distrohelena/canton-typescript-sdk";
import { comDigitalasset } from "@distrohelena/canton-typescript-sdk/protobuf";

declare const client: TopologyAggregationServiceClient;

const listRequest =
    comDigitalasset.canton.topology.admin.v30.ListPartiesRequest.create();

const listResult: Promise<
    comDigitalasset.canton.topology.admin.v30.ListPartiesResponse
> = client.listPartiesAsync(listRequest);

const waitResult: Promise<
    comDigitalasset.canton.topology.admin.v30.ListPartiesResponse_Result
> = client.waitForPartyHostingAsync(new WaitForPartyHostingRequest({
    partyId: "party::namespace",
    participantId: "participant::namespace",
    synchronizerId: "sync::namespace",
}));

void listResult;
void waitResult;
