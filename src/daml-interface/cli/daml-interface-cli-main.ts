import { DamlInterfaceCli } from "./daml-interface-cli.js";

const exitCode = await new DamlInterfaceCli().runAsync(process.argv.slice(2));

process.exitCode = exitCode;
