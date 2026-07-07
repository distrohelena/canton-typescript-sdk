import { CommandState } from "../command-state.js";

export class GetCommandStatusRequest {
    public readonly commandIdPrefix?: string;
    public readonly state?: CommandState;
    public readonly limit?: number;

    public constructor(init?: {
        commandIdPrefix?: string;
        state?: CommandState;
        limit?: number;
    }) {
        this.commandIdPrefix = init?.commandIdPrefix;
        this.state = init?.state;
        this.limit = init?.limit;
    }
}
