// Idempotent Phase 1 test-account seeding.
//
// Written in TypeScript rather than a raw .sql script: bcrypt hashes can't be
// hand-computed and pasted into SQL reliably (bcryptjs salts randomly per call,
// so there's no single "correct" hash string to embed), and this reuses the
// same mssql connection pool / query helpers as the rest of the app instead of
// requiring a separate SQL client. It's safe to re-run: role assignments are
// idempotent inserts, and passwords are reset to the known test value every run.
//
// Real seeded employees are used (not the IVI-0042 placeholder from the original
// spec, which doesn't exist in this database) — RamaKrishna Gangula (IVI-0011,
// MANAGER) is already hr.Employees.ManagerId for Naga Yashas (IVB036, EMPLOYEE),
// so the manager-scoped-access test in the integration suite has something real.
import { getPool, sql } from "../config/db.js";
import { hashPassword } from "../utils/password.js";

const TEST_PASSWORD = "Test@1234";

const ASSIGNMENTS: { userName: string; roleCodes: string[] }[] = [
  { userName: "naga.yashas@implevistait.com", roleCodes: ["EMPLOYEE"] },
  { userName: "ramakrishna.gangula@implevistait.com", roleCodes: ["EMPLOYEE", "MANAGER"] },
  { userName: "priya.nair@implevistait.com", roleCodes: ["EMPLOYEE", "HR_ADMIN"] },
  { userName: "arjun.mehta@implevistait.com", roleCodes: ["EMPLOYEE", "PAYROLL_ADMIN"] },
  { userName: "sneha.kulkarni@implevistait.com", roleCodes: ["EMPLOYEE", "SALES_REP"] },
  { userName: "vikram.rao@implevistait.com", roleCodes: ["EMPLOYEE", "SALES_MANAGER"] },
  { userName: "deepak.verma@implevistait.com", roleCodes: ["EMPLOYEE", "SYS_ADMIN"] },
];

const pool = await getPool();

const roles = await pool.request().query("SELECT RoleId, RoleCode FROM core.Roles");
const roleIdByCode = new Map<string, number>(roles.recordset.map((r) => [r.RoleCode, r.RoleId]));
const passwordHash = await hashPassword(TEST_PASSWORD);

for (const { userName, roleCodes } of ASSIGNMENTS) {
  const userResult = await pool
    .request()
    .input("name", sql.NVarChar(200), userName.toUpperCase())
    .query("SELECT UserId FROM core.Users WHERE NormalizedUserName = @name");
  const userId = userResult.recordset[0]?.UserId;
  if (!userId) {
    console.warn(`Skipping ${userName}: no such user`);
    continue;
  }

  await pool
    .request()
    .input("id", sql.Int, userId)
    .input("hash", sql.NVarChar(1000), passwordHash)
    .query(`UPDATE core.Users SET PasswordHash = @hash, SecurityStamp = NEWID(), FailedLoginCount = 0,
              LockoutEndUtc = NULL, MustChangePassword = 0, LastPasswordChgUtc = SYSUTCDATETIME()
            WHERE UserId = @id`);

  for (const code of roleCodes) {
    const roleId = roleIdByCode.get(code);
    if (!roleId) {
      console.warn(`Skipping role ${code} for ${userName}: role not found`);
      continue;
    }
    await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("roleId", sql.Int, roleId)
      .input("assignedBy", sql.Int, userId)
      .query(`IF NOT EXISTS (SELECT 1 FROM core.UserRoles WHERE UserId = @userId AND RoleId = @roleId)
              INSERT INTO core.UserRoles (UserId, RoleId, AssignedAtUtc, AssignedBy)
              VALUES (@userId, @roleId, SYSUTCDATETIME(), @assignedBy)`);
  }
  console.log(`${userName}: password reset to ${TEST_PASSWORD}, roles ${roleCodes.join(" + ")}`);
}

process.exit(0);
