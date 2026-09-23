import { Router } from "express";
import { z } from "zod";
import { getPool, sql } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { signToken } from "../utils/jwt.js";
import { verifyPassword } from "../utils/password.js";

export const authRouter = Router();

const MAX_FAILED = 5;
const LOCKOUT_MINUTES = 15;
const INVALID = "Invalid credentials";

const loginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

authRouter.post("/auth/login", async (req, res, next) => {
  try {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, "Email and password are required");

    const pool = await getPool();
    const found = await pool
      .request()
      .input("name", sql.NVarChar(200), body.data.email.toUpperCase())
      .query(`SELECT u.UserId, u.EmployeeId, u.PasswordHash, u.IsActive, u.FailedLoginCount, u.LockoutEndUtc,
                     e.FullName,
                     CASE WHEN u.LockoutEndUtc > SYSUTCDATETIME() THEN 1 ELSE 0 END AS IsLocked
              FROM core.Users u LEFT JOIN hr.Employees e ON e.EmployeeId = u.EmployeeId
              WHERE u.NormalizedUserName = @name`);
    const user = found.recordset[0];

    // Verify even for unknown users so response time doesn't reveal which emails exist.
    const ok = await verifyPassword(body.data.password, user?.PasswordHash ?? null);
    if (!user || !user.IsActive) throw new ApiError(401, INVALID);
    if (user.IsLocked) throw new ApiError(401, INVALID);

    if (!ok) {
      await pool
        .request()
        .input("id", sql.Int, user.UserId)
        .input("max", sql.Int, MAX_FAILED)
        .input("mins", sql.Int, LOCKOUT_MINUTES)
        .query(`UPDATE core.Users SET
                  FailedLoginCount = CASE WHEN FailedLoginCount + 1 >= @max THEN 0 ELSE FailedLoginCount + 1 END,
                  LockoutEndUtc = CASE WHEN FailedLoginCount + 1 >= @max THEN DATEADD(MINUTE, @mins, SYSUTCDATETIME()) ELSE LockoutEndUtc END
                WHERE UserId = @id`);
      throw new ApiError(401, INVALID);
    }

    const roleRows = await pool
      .request()
      .input("id", sql.Int, user.UserId)
      .query(`SELECT DISTINCT r.RoleCode FROM core.UserRoles ur JOIN core.Roles r ON r.RoleId = ur.RoleId WHERE ur.UserId = @id`);
    const permRows = await pool
      .request()
      .input("id", sql.Int, user.UserId)
      .query(`SELECT DISTINCT p.PermissionCode
              FROM core.UserRoles ur
              JOIN core.RolePermissions rp ON rp.RoleId = ur.RoleId
              JOIN core.Permissions p ON p.PermissionId = rp.PermissionId
              WHERE ur.UserId = @id`);
    const roles: string[] = roleRows.recordset.map((r) => r.RoleCode);
    const permissions: string[] = permRows.recordset.map((r) => r.PermissionCode);

    await pool
      .request()
      .input("id", sql.Int, user.UserId)
      .query("UPDATE core.Users SET FailedLoginCount = 0, LockoutEndUtc = NULL, LastLoginUtc = SYSUTCDATETIME() WHERE UserId = @id");

    const token = signToken({ sub: user.UserId, employeeId: user.EmployeeId, roles, permissions });
    res.json({ token, employeeId: user.EmployeeId, fullName: user.FullName as string | null, roles });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/auth/me", requireAuth, (req, res) => {
  res.json({ employeeId: req.user!.employeeId, roles: req.user!.roles, permissions: req.user!.permissions });
});

// Not part of the Phase 1 spec (which is deliberately stateless, resolved entirely
// from the token). Kept only so the existing frontend has something to call on
// sign-out; with pure JWTs there's no server-side revocation before expiry.
authRouter.post("/auth/logout", requireAuth, (_req, res) => {
  res.status(204).end();
});
