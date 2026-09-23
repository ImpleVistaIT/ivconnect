import { describe, expect, it } from "vitest";

Object.assign(process.env, {
  DB_SERVER: "x",
  DB_NAME: "x",
  DB_USER: "x",
  DB_PASSWORD: "x",
  JWT_SECRET: "s".repeat(40),
  PII_ENCRYPTION_KEY: "0".repeat(64),
});
const { buildPdfPassword } = await import("./pdfService.js");

describe("buildPdfPassword", () => {
  it("is PAN prefix (first 4, uppercase) + DDMM of DOB", () => {
    expect(buildPdfPassword("abcpy1234f", new Date(1994, 2, 12))).toBe("ABCP1203");
  });

  it("pads single-digit day/month", () => {
    expect(buildPdfPassword("XYZAB5678C", new Date(2000, 0, 5))).toBe("XYZA0501");
  });
});
