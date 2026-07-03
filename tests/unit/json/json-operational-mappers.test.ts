import { describe, expect, it } from "vitest";
import { mapJsonCreateParty } from "../../../src/transports/json/mappers/parties-mapper.js";
import { mapJsonHealth } from "../../../src/transports/json/mappers/system-mapper.js";

describe("JSON operational mappers", () => {
    it("maps health payloads", () => {
        const result = mapJsonHealth({ status: "healthy", version: "1.0.0" });

        expect(result.status).toBe("healthy");
        expect(result.version).toBe("1.0.0");
    });

    it("maps party creation payloads", () => {
        const result = mapJsonCreateParty({
            result: {
                identifier: "Alice",
            },
        });

        expect(result.party).toBe("Alice");
    });
});
