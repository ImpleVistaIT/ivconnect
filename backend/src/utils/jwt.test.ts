import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

const SECRET = "s".repeat(40);
Object.assign(process.env, {
  DB_SERVER: "x",
  DB_NAME: "x",
  DB_USER: "x",
  DB_PASSWORD: "x",
  JWT_SECRET: SECRET,
  PII_ENCRYPTION_KEY: "0".repeat(64),
});
const { signToken, verifyToken } = await import("./jwt.js");

const payload = { sub: 7, employeeId: 2, roles: ["EMPLOYEE"], permissions: ["payslip.read.self"] };

describe("jwt", () => {
  it("round-trips claims", () => {
    expect(verifyToken(signToken(payload))).toEqual(payload);
  });

  it("rejects a tampered signature", () => {
    const token = signToken(payload);
    const tampered = token.slice(0, -2) + (token.endsWith("A") ? "B" : "A");
    expect(verifyToken(tampered)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = jwt.sign({ roles: payload.roles, permissions: payload.permissions }, SECRET, { subject: "7", expiresIn: -10 });
    expect(verifyToken(token)).toBeNull();
  });

  it("rejects a wrong secret", () => {
    expect(verifyToken(signToken(payload), "z".repeat(40))).toBeNull();
  });

  it("rejects garbage and alg:none", () => {
    expect(verifyToken("not.a.token")).toBeNull();
    const none = jwt.sign({ roles: [], permissions: [] }, "", { subject: "1", algorithm: "none" });
    expect(verifyToken(none)).toBeNull();
  });
});
