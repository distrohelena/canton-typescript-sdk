import { Completion } from "./completion.js";
import { OffsetCheckpoint } from "./offset-checkpoint.js";

export class CompletionStreamResponse<
    TCompletion = Completion,
    TOffsetCheckpoint = OffsetCheckpoint,
> {
    public readonly completion?: TCompletion;
    public readonly offsetCheckpoint?: TOffsetCheckpoint;

    public constructor(init: {
        completion?: TCompletion;
        offsetCheckpoint?: TOffsetCheckpoint;
    }) {
        this.completion = init.completion;
        this.offsetCheckpoint = init.offsetCheckpoint;
    }
}
