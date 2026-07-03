export class DamlLfLanguageVersion {
    public readonly major: number;
    public readonly minor: string;
    public readonly patch: number;

    public constructor(init: {
        major: number;
        minor: string;
        patch: number;
    }) {
        this.major = init.major;
        this.minor = init.minor;
        this.patch = init.patch;
    }

    public toString(): string {
        return `${this.major}.${this.minor}`;
    }
}
