import { Router } from "express";
import { z } from "zod";
import { getPool, sql } from "../config/db.js";
import { requireRole } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";

export const usersRouter = Router();

usersRouter.get("/users", requireRole("SYS_ADMIN"), async (_req, res, next) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(
      `SELECT u.UserId, u.UserName, u.IsActive, u.LastLoginUtc, e.EmployeeCode, e.FullName,
              (SELECT r.RoleCode FROM core.UserRoles ur JOIN core.Roles r ON r.RoleId = ur.RoleId
               WHERE ur.UserId = u.UserId FOR JSON PATH) AS RolesJson
       FROM core.Users u LEFT JOIN hr.Employees e ON e.EmployeeId = u.EmployeeId ORDER BY u.UserId`,
    );
    res.json(
      r.recordset.map((u) => ({
        userId: u.UserId,
        userName: u.UserName,
        isActive: u.IsActive,
        lastLoginUtc: u.LastLoginUtc,
        employeeCode: u.EmployeeCode,
        fullName: u.FullName,
        roles: u.RolesJson ? (JSON.parse(u.RolesJson) as { RoleCode: string }[]).map((x) => x.RoleCode) : [],
      })),
    );
  } catch (err) {
    next(err);
  }
});

const assignRoleSchema = z.object({ roleCode: z.string().min(1) });

usersRouter.post("/users/:id/roles", requireRole("SYS_ADMIN"), async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) throw new ApiError(400, "Invalid user id");
    const body = assignRoleSchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, "roleCode is required");

    const pool = await getPool();
    const role = await pool
      .request()
      .input("code", sql.VarChar(30), body.data.roleCode)
      .query("SELECT RoleId FROM core.Roles WHERE RoleCode = @code");
    if (!role.recordset[0]) throw new ApiError(404, "No such role");

    await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("roleId", sql.Int, role.recordset[0].RoleId)
      .input("assignedBy", sql.Int, req.user!.userId)
      .query(`IF NOT EXISTS (SELECT 1 FROM core.UserRoles WHERE UserId = @userId AND RoleId = @roleId)
              INSERT INTO core.UserRoles (UserId, RoleId, AssignedAtUtc, AssignedBy)
              VALUES (@userId, @roleId, SYSUTCDATETIME(), @assignedBy)`);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

usersRouter.delete("/users/:id/roles/:roleCode", requireRole("SYS_ADMIN"), async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) throw new ApiError(400, "Invalid user id");

    const pool = await getPool();
    await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("code", sql.VarChar(30), req.params.roleCode)
      .query(`DELETE ur FROM core.UserRoles ur JOIN core.Roles r ON r.RoleId = ur.RoleId
              WHERE ur.UserId = @userId AND r.RoleCode = @code`);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
