import { ContractArchived } from "../contract-archived.js";
import { ContractCreated } from "../contract-created.js";

export class GetEventsByContractIdResponse<
    TCreatedEvent = unknown,
    TArchivedEvent = unknown,
> {
    public readonly created?: ContractCreated<TCreatedEvent>;
    public readonly archived?: ContractArchived<TArchivedEvent>;

    public constructor(init: {
        created?: ContractCreated<TCreatedEvent>;
        archived?: ContractArchived<TArchivedEvent>;
    }) {
        this.created = init.created;
        this.archived = init.archived;
    }
}
