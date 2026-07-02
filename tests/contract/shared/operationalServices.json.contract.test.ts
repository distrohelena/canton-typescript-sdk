import { describe, expect, it } from "vitest";
import {
  CreatePartyRequest,
  GrantUserRightsRequest,
  HealthStatusResponse,
  PackageFormat,
  UploadPackageRequest,
  UserRightKind
} from "../../../src";
import { PackagesClient } from "../../../src/services/packages/packagesClient.js";
import { PartiesClient } from "../../../src/services/parties/partiesClient.js";
import { SystemClient } from "../../../src/services/system/systemClient.js";
import { UsersClient } from "../../../src/services/users/usersClient.js";
import { JsonTransport } from "../../../src/transports/json/jsonTransport.js";

describe("JSON operational services contract", () => {
  it("supports the shared operational service surface", async () => {
    const transport = new JsonTransport({
      getAsync: async () => ({ status: "healthy", version: "1.0.0" }),
      postAsync: async (path: string) => {
        if (path === "/v1/parties/allocate") {
          return { result: { identifier: "Alice" } };
        }

        if (path === "/v1/user/rights/grant") {
          return {
            result: [{ type: "participantAdmin" }]
          };
        }

        if (path === "/v1/packages") {
          return { result: { packageId: "pkg-1" } };
        }

        return {};
      }
    });

    const system = new SystemClient(transport);
    const parties = new PartiesClient(transport);
    const users = new UsersClient(transport);
    const packages = new PackagesClient(transport);

    await expect(system.getHealthAsync()).resolves.toBeInstanceOf(HealthStatusResponse);
    await expect(parties.createAsync(new CreatePartyRequest())).resolves.toMatchObject({
      party: "Alice"
    });
    await expect(
      users.grantRightsAsync(
        new GrantUserRightsRequest({
          userId: "carol",
          rights: [{ type: UserRightKind.participantAdmin }]
        })
      )
    ).resolves.toMatchObject({
      rights: [{ type: UserRightKind.participantAdmin }]
    });
    await expect(
      packages.uploadAsync(
        new UploadPackageRequest({
          bytes: new Uint8Array([1, 2, 3]),
          format: PackageFormat.dar
        })
      )
    ).resolves.toMatchObject({
      packageId: "pkg-1"
    });
  });
});
