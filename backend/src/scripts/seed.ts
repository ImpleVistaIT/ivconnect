// Idempotent Phase 1 test-account seeding — replaces the fictional 7-account set
// (Naga Yashas, RamaKrishna Gangula, Priya Nair, Arjun Mehta, Sneha Kulkarni,
// Vikram Rao, Deepak Verma) with the 9 real accounts below.
//
// Idempotent by email: on every run, any existing user/employee row matching
// either the OLD or NEW email lists is fully removed (including dependent rows:
// payslips, leave requests, resumes, addresses, etc. for that employee, and
// role assignments/tokens for that user) before the 9 new accounts are
// (re)inserted fresh. Safe to re-run repeatedly against the same database.
//
// Names for the 3 real-person employees and the manager are best-effort,
// derived from the email local-part (e.g. "vadivel.ag" -> "Vadivel" / "Ag")
// since no display names were given — correct them later via PUT /employees/:id
// if they're wrong. The 5 functional/role accounts use their designation title
// as the name (e.g. "HR Administrator" -> FirstName "HR", LastName "Administrator"),
// which is deliberate, not a guess.
import { createHash } from "node:crypto";
import { getPool, sql } from "../config/db.js";
import { hashPassword } from "../utils/password.js";

const TEST_PASSWORD = "Test@1234";

const OLD_EMAILS = [
  "naga.yashas@implevistait.com",
  "ramakrishna.gangula@implevistait.com",
  "priya.nair@implevistait.com",
  "arjun.mehta@implevistait.com",
  "sneha.kulkarni@implevistait.com",
  "vikram.rao@implevistait.com",
  "deepak.verma@implevistait.com",
];

interface NewAccount {
  code: string;
  email: string;
  firstName: string;
  lastName: string;
  designationTitle: string;
  departmentCode: string | null;
  roleCodes: string[];
  isManager: boolean; // becomes ManagerId for the 3 SAP employees below
  reportsToManager: boolean;
}

const NEW_ACCOUNTS: NewAccount[] = [
  {
    code: "IVI-2001",
    email: "rama.gangula@implevistait.com",
    firstName: "Rama",
    lastName: "Gangula",
    designationTitle: "Sales & Customer Relationship Manager",
    departmentCode: "SALES",
    roleCodes: ["EMPLOYEE", "MANAGER"],
    isManager: true,
    reportsToManager: false,
  },
  {
    code: "IVI-2002",
    email: "vadivel.ag@implevistait.com",
    firstName: "Vadivel",
    lastName: "Ag",
    designationTitle: "Sr. SAP Lead",
    departmentCode: "SAP",
    roleCodes: ["EMPLOYEE"],
    isManager: false,
    reportsToManager: true,
  },
  {
    code: "IVI-2003",
    email: "nagayashas@implevistait.com",
    firstName: "Nagayashas",
    lastName: "",
    designationTitle: "SAP Associate Consultant",
    departmentCode: "SAP",
    roleCodes: ["EMPLOYEE"],
    isManager: false,
    reportsToManager: true,
  },
  {
    code: "IVI-2004",
    email: "chandrakanth@implevistait.com",
    firstName: "Chandrakanth",
    lastName: "",
    designationTitle: "SAP Basis",
    departmentCode: "SAP",
    roleCodes: ["EMPLOYEE"],
    isManager: false,
    reportsToManager: true,
  },
  {
    code: "IVI-2005",
    email: "hr@implevistait.com",
    firstName: "HR",
    lastName: "Administrator",
    designationTitle: "HR Administrator",
    departmentCode: "HR",
    roleCodes: ["EMPLOYEE", "HR_ADMIN"],
    isManager: false,
    reportsToManager: false,
  },
  {
    code: "IVI-2006",
    email: "payroll@implevistait.com",
    firstName: "Payroll",
    lastName: "Administrator",
    designationTitle: "Payroll Administrator",
    departmentCode: "FIN",
    roleCodes: ["EMPLOYEE", "PAYROLL_ADMIN"],
    isManager: false,
    reportsToManager: false,
  },
  {
    code: "IVI-2007",
    email: "salesrep@implevistait.com",
    firstName: "Sales",
    lastName: "Representative",
    designationTitle: "Sales Representative",
    departmentCode: "SALES",
    roleCodes: ["EMPLOYEE", "SALES_REP"],
    isManager: false,
    reportsToManager: false,
  },
  {
    code: "IVI-2008",
    email: "salesmanager@implevistait.com",
    firstName: "Sales",
    lastName: "Manager",
    designationTitle: "Sales Manager",
    departmentCode: "SALES",
    roleCodes: ["EMPLOYEE", "SALES_MANAGER"],
    isManager: false,
    reportsToManager: false,
  },
  {
    code: "IVI-2009",
    email: "sysadmin@implevistait.com",
    firstName: "System",
    lastName: "Administrator",
    designationTitle: "System Administrator",
    departmentCode: "ADM",
    roleCodes: ["EMPLOYEE", "SYS_ADMIN"],
    isManager: false,
    reportsToManager: false,
  },
];

const NEW_EMAILS = NEW_ACCOUNTS.map((a) => a.email);
const pool = await getPool();

// --- 1. Remove any existing rows (old fictional set or a prior run of this
// script) for every managed email, cascading through dependent tables. ---
async function purgeByEmails(emails: string[]): Promise<void> {
  // These emails are trusted compile-time constants (declared above), not user
  // input, so a direct SQL literal list is safe here — same standard as the
  // in-memory numeric id lists built below.
  const literalList = emails.map((e) => `'${e.toUpperCase().replace(/'/g, "''")}'`).join(",");
  const users = await pool.request().query(`SELECT UserId, EmployeeId FROM core.Users WHERE NormalizedUserName IN (${literalList})`);
  const userIds: number[] = users.recordset.map((r) => r.UserId);
  const employeeIds: number[] = users.recordset.map((r) => r.EmployeeId).filter((id) => id != null);
  if (userIds.length === 0 && employeeIds.length === 0) return;

  const inList = (ids: number[]) => (ids.length ? ids.join(",") : "-1");

  if (userIds.length) {
    await pool.request().query(`DELETE FROM core.RefreshTokens WHERE UserId IN (${inList(userIds)})`);
    await pool.request().query(`DELETE FROM core.SecurityTokens WHERE UserId IN (${inList(userIds)})`);
    await pool.request().query(`DELETE FROM core.Notifications WHERE UserId IN (${inList(userIds)})`);
    await pool.request().query(`DELETE FROM core.UserRoles WHERE UserId IN (${inList(userIds)})`);
  }
  if (employeeIds.length) {
    await pool.request().query(`DELETE pc FROM payroll.PayslipComponents pc
      JOIN payroll.Payslips p ON p.PayslipId = pc.PayslipId WHERE p.EmployeeId IN (${inList(employeeIds)})`);
    await pool.request().query(`DELETE FROM payroll.Payslips WHERE EmployeeId IN (${inList(employeeIds)})`);
    await pool.request().query(`DELETE FROM payroll.PayslipStaging WHERE ResolvedEmployeeId IN (${inList(employeeIds)})`);
    await pool.request().query(`DELETE FROM leave.LeaveBalanceLedger WHERE EmployeeId IN (${inList(employeeIds)})`);
    await pool.request().query(`DELETE FROM leave.LeaveRequests WHERE EmployeeId IN (${inList(employeeIds)}) OR ApproverEmployeeId IN (${inList(employeeIds)})`);
    await pool.request().query(`DELETE FROM hr.ResumeNoChangeConfirmations WHERE EmployeeId IN (${inList(employeeIds)})`);
    await pool.request().query(`DELETE FROM hr.Resumes WHERE EmployeeId IN (${inList(employeeIds)})`);
    await pool.request().query(`DELETE FROM hr.EmployeeAddresses WHERE EmployeeId IN (${inList(employeeIds)})`);
    await pool.request().query(`UPDATE hr.Employees SET ManagerId = NULL WHERE ManagerId IN (${inList(employeeIds)})`);
    await pool.request().query(`UPDATE hr.Departments SET HeadEmployeeId = NULL WHERE HeadEmployeeId IN (${inList(employeeIds)})`);
  }
  if (userIds.length) await pool.request().query(`DELETE FROM core.Users WHERE UserId IN (${inList(userIds)})`);
  if (employeeIds.length) await pool.request().query(`DELETE FROM hr.Employees WHERE EmployeeId IN (${inList(employeeIds)})`);
}

await purgeByEmails([...OLD_EMAILS, ...NEW_EMAILS]);
console.log(`Purged any existing rows for ${OLD_EMAILS.length} old + ${NEW_EMAILS.length} new managed emails.`);

// --- 2. Resolve roles, departments, and find-or-create designations. ---
const roles = await pool.request().query("SELECT RoleId, RoleCode FROM core.Roles");
const roleIdByCode = new Map<string, number>(roles.recordset.map((r) => [r.RoleCode, r.RoleId]));

const departments = await pool.request().query("SELECT DepartmentId, Code FROM hr.Departments");
const departmentIdByCode = new Map<string, number>(departments.recordset.map((d) => [d.Code, d.DepartmentId]));

async function findOrCreateDesignation(title: string): Promise<number> {
  const existing = await pool.request().input("title", sql.NVarChar(160), title).query("SELECT DesignationId FROM hr.Designations WHERE Title = @title");
  if (existing.recordset[0]) return existing.recordset[0].DesignationId;
  const code = title
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 20);
  const created = await pool
    .request()
    .input("code", sql.VarChar(20), code)
    .input("title", sql.NVarChar(160), title)
    .query("INSERT INTO hr.Designations (Code, Title, IsActive) OUTPUT INSERTED.DesignationId VALUES (@code, @title, 1)");
  return created.recordset[0].DesignationId;
}

const passwordHash = await hashPassword(TEST_PASSWORD);

// --- 3. Insert the manager first (so the 3 SAP employees can reference it). ---
const employeeIdByEmail = new Map<string, number>();

for (const account of NEW_ACCOUNTS.filter((a) => !a.reportsToManager)) {
  await insertAccount(account, null);
}
const managerEmployeeId = employeeIdByEmail.get("rama.gangula@implevistait.com")!;
for (const account of NEW_ACCOUNTS.filter((a) => a.reportsToManager)) {
  await insertAccount(account, managerEmployeeId);
}

async function insertAccount(account: NewAccount, managerId: number | null): Promise<void> {
  const designationId = await findOrCreateDesignation(account.designationTitle);
  const departmentId = account.departmentCode ? (departmentIdByCode.get(account.departmentCode) ?? null) : null;

  // hr.Employees.PanHash has a plain UNIQUE constraint, and SQL Server (unlike most
  // databases) only allows ONE NULL under a unique constraint — so every row needs
  // a distinct value even though no real PAN was ever collected for these accounts.
  // This is a harmless placeholder hash, not derived from any real PAN.
  const panHashPlaceholder = createHash("sha256").update(`no-pan:${account.code}`).digest();

  const empResult = await pool
    .request()
    .input("code", sql.NVarChar(40), account.code)
    .input("first", sql.NVarChar(120), account.firstName)
    .input("last", sql.NVarChar(120), account.lastName)
    .input("email", sql.NVarChar(200), account.email)
    .input("panHash", sql.VarBinary, panHashPlaceholder)
    .input("designationId", sql.Int, designationId)
    .input("departmentId", sql.Int, departmentId)
    .input("managerId", sql.Int, managerId)
    .query(`INSERT INTO hr.Employees
              (EmployeeCode, FirstName, LastName, OfficialEmail, PanHash, DesignationId, DepartmentId, ManagerId,
               EncryptionKeyVer, DateOfJoining, EmploymentStatus, EmploymentType, WorkLocationCode, IsDeleted,
               CreatedAtUtc, CreatedBy)
            OUTPUT INSERTED.EmployeeId
            VALUES (@code, @first, @last, @email, @panHash, @designationId, @departmentId, @managerId,
                    1, CAST(SYSUTCDATETIME() AS date), 'Active', 'FullTime', 'ALL', 0,
                    SYSUTCDATETIME(), 1)`);
  const employeeId = empResult.recordset[0].EmployeeId as number;
  employeeIdByEmail.set(account.email, employeeId);

  const userResult = await pool
    .request()
    .input("employeeId", sql.Int, employeeId)
    .input("userName", sql.NVarChar(200), account.email)
    .input("normalized", sql.NVarChar(200), account.email.toUpperCase())
    .input("hash", sql.NVarChar(1000), passwordHash)
    .query(`INSERT INTO core.Users
              (UserGuid, EmployeeId, UserName, NormalizedUserName, PasswordHash, SecurityStamp, IsActive,
               MustChangePassword, MfaEnabled, FailedLoginCount, CreatedAtUtc, CreatedBy)
            OUTPUT INSERTED.UserId
            VALUES (NEWID(), @employeeId, @userName, @normalized, @hash, NEWID(), 1, 0, 0, 0, SYSUTCDATETIME(), 1)`);
  const userId = userResult.recordset[0].UserId as number;

  for (const roleCode of account.roleCodes) {
    const roleId = roleIdByCode.get(roleCode);
    if (!roleId) {
      console.warn(`Skipping role ${roleCode} for ${account.email}: role not found`);
      continue;
    }
    await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("roleId", sql.Int, roleId)
      .input("assignedBy", sql.Int, userId)
      .query(`INSERT INTO core.UserRoles (UserId, RoleId, AssignedAtUtc, AssignedBy) VALUES (@userId, @roleId, SYSUTCDATETIME(), @assignedBy)`);
  }

  console.log(`${account.email}: ${account.code}, ${account.designationTitle}, roles ${account.roleCodes.join(" + ")}`);
}

console.log(`\nDone. Password for all ${NEW_ACCOUNTS.length} accounts: ${TEST_PASSWORD}`);
process.exit(0);
