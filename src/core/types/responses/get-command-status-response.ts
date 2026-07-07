import { CommandStatus } from "../command-status.js";

export class GetCommandStatusResponse {
    public readonly commandStatuses: readonly CommandStatus[];

    public constructor(init?: {
        commandStatuses?: readonly CommandStatus[];
    }) {
        this.commandStatuses = init?.commandStatuses ?? [];
    }
}
