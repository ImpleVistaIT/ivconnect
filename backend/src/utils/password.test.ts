import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password", () => {
  it("round-trips correctly", async () => {
    const hash = await hashPassword("Test@1234");
    expect(await verifyPassword("Test@1234", hash)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("Test@1234");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("rejects a null/malformed hash without throwing", async () => {
    expect(await verifyPassword("x", null)).toBe(false);
    expect(await verifyPassword("x", "not-a-bcrypt-hash")).toBe(false);
  });
});
