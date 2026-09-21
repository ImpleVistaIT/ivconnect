import { Router } from "express";
import { getPool } from "../config/db.js";

export const rolesRouter = Router();

rolesRouter.get("/roles", async (_req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .query("SELECT RoleCode, RoleName FROM core.Roles ORDER BY RoleId");
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});
