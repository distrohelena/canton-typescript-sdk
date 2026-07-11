import { SourceMappingPrecision } from "../source/source-mapping-precision.js";

export class ReplaySourceLocation {
    public readonly path?: string;
    public readonly startLine?: number;
    public readonly startColumn?: number;
    public readonly endLine?: number;
    public readonly endColumn?: number;
    public readonly precision: SourceMappingPrecision;

    public constructor(init: {
        path?: string;
        startLine?: number;
        startColumn?: number;
        endLine?: number;
        endColumn?: number;
        precision: SourceMappingPrecision;
    }) {
        this.path = init?.path;
        this.startLine = init?.startLine;
        this.startColumn = init?.startColumn;
        this.endLine = init?.endLine;
        this.endColumn = init?.endColumn;
        this.precision = init.precision;
    }
}
