import { anonymousTrpc } from "../../testutils";

describe("getRegistrationStatus", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("success", () => {
    test("returns enabled when registration is not disabled", async () => {
      vi.stubEnv("DISABLE_REGISTRATION", "false");

      const response = await anonymousTrpc.users.getRegistrationStatus();

      expect(response.enabled).toEqual(true);
    });

    test("returns disabled when DISABLE_REGISTRATION is true", async () => {
      vi.stubEnv("DISABLE_REGISTRATION", "true");

      const response = await anonymousTrpc.users.getRegistrationStatus();

      expect(response.enabled).toEqual(false);
    });
  });
});
