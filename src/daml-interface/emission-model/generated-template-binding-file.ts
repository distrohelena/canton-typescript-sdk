import { GeneratedTemplateBinding } from "./generated-template-binding.js";

export class GeneratedTemplateBindingFile {
    public readonly path: string;
    public readonly contents: string;
    public readonly binding: GeneratedTemplateBinding;

    public constructor(init: {
        path: string;
        contents: string;
        binding: GeneratedTemplateBinding;
    }) {
        this.path = init.path;
        this.contents = init.contents;
        this.binding = init.binding;
    }
}
