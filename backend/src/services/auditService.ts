import { getPool, sql } from "../config/db.js";

export interface LogAccessParams {
  actorUserId: number;
  action: string;
  targetEmployeeId?: number | string;
  details?: string;
  ipAddress?: string | null;
}

// Writes one row to audit.AuditLogs. Matches the existing table exactly — see
// database/baseline/IVConnect_baseline.sql for the audit schema.
export async function logAccess(params: LogAccessParams): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input("eventType", sql.VarChar(40), params.action)
    .input("entityName", sql.VarChar(60), "hr.Employees")
    .input("entityKey", sql.VarChar(60), params.targetEmployeeId != null ? String(params.targetEmployeeId) : null)
    .input("actorUserId", sql.Int, params.actorUserId)
    .input("ipAddress", sql.VarChar(45), params.ipAddress ?? null)
    .input("notes", sql.NVarChar(800), params.details ?? null)
    .query(`INSERT INTO audit.AuditLogs (EventType, EntityName, EntityKey, ActorUserId, OccurredAtUtc, IpAddress, Notes)
            VALUES (@eventType, @entityName, @entityKey, @actorUserId, SYSUTCDATETIME(), @ipAddress, @notes)`);
}
