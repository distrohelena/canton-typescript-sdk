import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { GeneratedDamlInterfaceProject } from "../emission-model/generated-daml-interface-project.js";

export class DamlInterfaceWriter {
    /** Writes a generated in-memory project to the requested output directory. */
    public async writeProjectAsync(
        project: GeneratedDamlInterfaceProject,
        outputDirectory: string,
    ): Promise<void> {
        const files = [
            ...project.templateFiles,
            ...project.supportFiles,
            project.registryFile,
            project.indexFile,
        ].filter((item) => item !== undefined);

        for (const file of files) {
            const path = join(outputDirectory, file.path);

            await mkdir(dirname(path), {
                recursive: true,
            });
            await writeFile(path, file.contents, "utf8");
        }
    }
}
