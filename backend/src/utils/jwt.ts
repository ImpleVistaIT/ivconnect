import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export interface TokenPayload {
  sub: number;
  employeeId: number | null;
  roles: string[];
  permissions: string[];
}

export function signToken(payload: TokenPayload, secret = env.JWT_SECRET, expiresIn = env.JWT_EXPIRES_IN): string {
  return jwt.sign(
    { employeeId: payload.employeeId, roles: payload.roles, permissions: payload.permissions },
    secret,
    { subject: String(payload.sub), expiresIn, algorithm: "HS256" } as SignOptions,
  );
}

export function verifyToken(token: string, secret = env.JWT_SECRET): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
    if (typeof decoded === "string") return null;
    const sub = Number(decoded.sub);
    if (!Number.isInteger(sub) || !Array.isArray(decoded.roles) || !Array.isArray(decoded.permissions)) return null;
    return {
      sub,
      employeeId: typeof decoded.employeeId === "number" ? decoded.employeeId : null,
      roles: decoded.roles,
      permissions: decoded.permissions,
    };
  } catch {
    return null;
  }
}
