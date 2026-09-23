import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt.js";
import { ApiError } from "./errorHandler.js";

// Stateless: everything needed (roles, permissions, employeeId) was resolved once
// at login and lives in the token itself — no DB round-trip on every request.
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const claims = token ? verifyToken(token) : null;
  if (!claims) {
    next(new ApiError(401, "Authentication required"));
    return;
  }
  req.user = { userId: claims.sub, employeeId: claims.employeeId, roles: claims.roles, permissions: claims.permissions };
  next();
}

export function requireRole(...roleCodes: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user?.roles.some((r) => roleCodes.includes(r))) {
      next(new ApiError(403, "You do not have access to this resource"));
      return;
    }
    next();
  };
}

export function requirePermission(permissionCode: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user?.permissions.includes(permissionCode)) {
      next(new ApiError(403, "You do not have access to this resource"));
      return;
    }
    next();
  };
}

// Allows the request if the caller's own employeeId matches the target, OR they
// hold the given permission (e.g. "view employee profile": self, or HR with
// employee.read.all). Route handlers still need their own logic for anything
// beyond this go/no-go check (e.g. the manager-sees-masked-data case).
export function requireSelfOrPermission(getTargetEmployeeId: (req: Request) => string, permissionCode: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const target = getTargetEmployeeId(req);
    const isSelf = req.user?.employeeId != null && String(req.user.employeeId) === target;
    if (!isSelf && !req.user?.permissions.includes(permissionCode)) {
      next(new ApiError(403, "You do not have access to this resource"));
      return;
    }
    next();
  };
}
