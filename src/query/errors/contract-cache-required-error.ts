import { CantonError } from "../../core/errors/canton-error.js";

/**
 * gRPC typed queries never download the ACS implicitly: reading active contracts requires an explicitly
 * warmed contract cache, so the (potentially very large) ACS transfer only ever happens when the caller
 * asks for it via cacheContracts(). Thrown when an ACS-backed query runs without a warm entry for its
 * party scope.
 */
export class ContractCacheRequiredError extends CantonError {
    public constructor(public readonly parties?: readonly string[]) {
        super(
            "gRPC active-contract queries require a warmed contract cache. Configure the cache "
                + "({ store, ttlMs }) and call cacheContracts("
                + (parties === undefined ? "" : JSON.stringify({ parties }))
                + ") before querying; the prewarm's party scope must match the query's.",
        );
    }
}
