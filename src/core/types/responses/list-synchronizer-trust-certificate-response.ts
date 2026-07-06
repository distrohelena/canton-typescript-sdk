import { SynchronizerTrustCertificate } from "../topology/synchronizer-trust-certificate.js";
import { TopologyMappingResult } from "../topology/topology-mapping-result.js";

export class ListSynchronizerTrustCertificateResponse {
    public readonly results: TopologyMappingResult<SynchronizerTrustCertificate>[];

    public constructor(init: {
        results: TopologyMappingResult<SynchronizerTrustCertificate>[];
    }) {
        this.results = [...init.results];
    }
}
