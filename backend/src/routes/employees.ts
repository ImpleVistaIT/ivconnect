import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { getPool, sql } from "../config/db.js";
import { requirePermission } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { logAccess } from "../services/auditService.js";
import { decryptField, encryptField } from "../utils/encryption.js";
import { maskPan, maskPhone } from "../utils/masking.js";
import { hashPassword } from "../utils/password.js";

export const employeesRouter = Router();

const EMPLOYEE_COLUMNS = `e.EmployeeId, e.EmployeeCode, e.FullName, e.FirstName, e.MiddleName, e.LastName,
       e.DateOfBirth, e.Gender, e.OfficialEmail, e.PersonalEmail, e.PanEncrypted, e.ContactNoEncrypted,
       e.DateOfJoining, e.DateOfExit, e.EmploymentStatus, e.EmploymentType, e.WorkLocationCode,
       e.ManagerId, des.Title AS Designation, dep.Name AS Department, m.FullName AS ManagerName`;

const EMPLOYEE_JOIN = `FROM hr.Employees e
   JOIN hr.Designations des ON des.DesignationId = e.DesignationId
   LEFT JOIN hr.Departments dep ON dep.DepartmentId = e.DepartmentId
   LEFT JOIN hr.Employees m ON m.EmployeeId = e.ManagerId
  WHERE e.IsDeleted = 0`;

interface EmployeeRow {
  EmployeeId: number;
  EmployeeCode: string;
  FullName: string;
  FirstName: string;
  MiddleName: string | null;
  LastName: string;
  DateOfBirth: Date | null;
  Gender: string | null;
  OfficialEmail: string;
  PersonalEmail: string | null;
  PanEncrypted: Buffer | null;
  ContactNoEncrypted: Buffer | null;
  DateOfJoining: Date;
  DateOfExit: Date | null;
  EmploymentStatus: string;
  EmploymentType: string;
  WorkLocationCode: string;
  ManagerId: number | null;
  Designation: string;
  Department: string | null;
  ManagerName: string | null;
}

function serialize(row: EmployeeRow, masked: boolean) {
  const pan = row.PanEncrypted ? decryptField(row.PanEncrypted) : null;
  const contact = row.ContactNoEncrypted ? decryptField(row.ContactNoEncrypted) : null;
  return {
    employeeId: row.EmployeeId,
    employeeCode: row.EmployeeCode,
    fullName: row.FullName,
    firstName: row.FirstName,
    middleName: row.MiddleName,
    lastName: row.LastName,
    dateOfBirth: row.DateOfBirth,
    gender: row.Gender,
    officialEmail: row.OfficialEmail,
    personalEmail: row.PersonalEmail,
    pan: pan == null ? null : masked ? maskPan(pan) : pan,
    contactNo: contact == null ? null : masked ? maskPhone(contact) : contact,
    dateOfJoining: row.DateOfJoining,
    dateOfExit: row.DateOfExit,
    employmentStatus: row.EmploymentStatus,
    employmentType: row.EmploymentType,
    workLocation: row.WorkLocationCode,
    managerId: row.ManagerId,
    managerName: row.ManagerName,
    designation: row.Designation,
    department: row.Department,
  };
}

async function fetchEmployee(employeeId: number): Promise<EmployeeRow | undefined> {
  const pool = await getPool();
  const r = await pool.request().input("id", sql.Int, employeeId).query(`SELECT ${EMPLOYEE_COLUMNS} ${EMPLOYEE_JOIN} AND e.EmployeeId = @id`);
  return r.recordset[0];
}

employeesRouter.get("/employees/me", async (req, res, next) => {
  try {
    if (!req.user!.employeeId) throw new ApiError(404, "No employee profile linked to this user");
    const row = await fetchEmployee(req.user!.employeeId);
    if (!row) throw new ApiError(404, "Employee not found");
    res.json(serialize(row, false));
  } catch (err) {
    next(err);
  }
});

// Three-way access: self -> unmasked; HR (employee.read.all) -> unmasked + audit;
// direct manager without employee.read.all -> masked; anyone else -> 403.
// Deliberately not gated by requireSelfOrPermission: that helper is a two-way
// (self OR permission) check and would 403 a manager before this logic ever runs.
employeesRouter.get("/employees/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ApiError(400, "Invalid employee id");
    const row = await fetchEmployee(id);
    if (!row) throw new ApiError(404, "Employee not found");

    const isSelf = req.user!.employeeId === id;
    const isHrAdmin = req.user!.permissions.includes("employee.read.all");
    const isDirectManager = req.user!.employeeId != null && row.ManagerId === req.user!.employeeId;

    if (isSelf) {
      res.json(serialize(row, false));
      return;
    }
    if (isHrAdmin) {
      await logAccess({
        actorUserId: req.user!.userId,
        action: "EMPLOYEE_PII_VIEWED",
        targetEmployeeId: id,
        details: `HR admin viewed employee ${row.EmployeeCode}`,
        ipAddress: req.ip,
      });
      res.json(serialize(row, false));
      return;
    }
    if (isDirectManager) {
      res.json(serialize(row, true));
      return;
    }
    throw new ApiError(403, "You do not have access to this employee's record");
  } catch (err) {
    next(err);
  }
});

employeesRouter.get("/employees", requirePermission("employee.read.all"), async (_req, res, next) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`SELECT ${EMPLOYEE_COLUMNS} ${EMPLOYEE_JOIN} ORDER BY e.EmployeeCode`);
    res.json(r.recordset.map((row: EmployeeRow) => serialize(row, true)));
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  firstName: z.string().min(1),
  middleName: z.string().optional().nullable(),
  lastName: z.string().min(1),
  officialEmail: z.string().email(),
  personalEmail: z.string().email().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(["M", "F", "O"]).optional().nullable(),
  pan: z.string().min(1).optional().nullable(),
  contactNo: z.string().min(1).optional().nullable(),
  designationId: z.number().int().positive(),
  departmentId: z.number().int().positive().optional().nullable(),
  managerId: z.number().int().positive().optional().nullable(),
  dateOfJoining: z.string().min(1),
  employmentType: z.enum(["FullTime", "PartTime", "Contract", "Intern"]).default("FullTime"),
  workLocationCode: z.string().default("ALL"),
});

function generateTemporaryPassword(): string {
  return `Iv${randomBytes(6).toString("base64url")}!1`;
}

function nextEmployeeCode(): string {
  return `IVI-${randomBytes(3).readUIntBE(0, 3).toString().slice(0, 4).padStart(4, "0")}`;
}

employeesRouter.post("/employees", requirePermission("employee.write"), async (req, res, next) => {
  try {
    const body = createSchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, body.error.issues[0]?.message ?? "Invalid request body");
    const d = body.data;

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const employeeCode = nextEmployeeCode();
      const empResult = await new sql.Request(transaction)
        .input("code", sql.NVarChar(40), employeeCode)
        .input("first", sql.NVarChar(120), d.firstName)
        .input("middle", sql.NVarChar(120), d.middleName ?? null)
        .input("last", sql.NVarChar(120), d.lastName)
        .input("dob", sql.Date, d.dateOfBirth ?? null)
        .input("gender", sql.Char(1), d.gender ?? null)
        .input("officialEmail", sql.NVarChar(200), d.officialEmail)
        .input("personalEmail", sql.NVarChar(200), d.personalEmail ?? null)
        .input("pan", sql.VarBinary, d.pan ? encryptField(d.pan.toUpperCase()) : null)
        .input("panMasked", sql.NVarChar(24), d.pan ? maskPan(d.pan) : null)
        .input("contact", sql.VarBinary, d.contactNo ? encryptField(d.contactNo) : null)
        .input("contactLast4", sql.Char(4), d.contactNo ? d.contactNo.slice(-4) : null)
        .input("designationId", sql.Int, d.designationId)
        .input("departmentId", sql.Int, d.departmentId ?? null)
        .input("managerId", sql.Int, d.managerId ?? null)
        .input("doj", sql.Date, d.dateOfJoining)
        .input("employmentType", sql.VarChar(20), d.employmentType)
        .input("workLocation", sql.VarChar(20), d.workLocationCode)
        .input("createdBy", sql.Int, req.user!.userId)
        .query(`INSERT INTO hr.Employees
                  (EmployeeCode, FirstName, MiddleName, LastName, DateOfBirth, Gender, OfficialEmail, PersonalEmail,
                   PanEncrypted, PanMasked, ContactNoEncrypted, ContactNoLast4, EncryptionKeyVer,
                   DesignationId, DepartmentId, ManagerId, DateOfJoining, EmploymentStatus, EmploymentType,
                   WorkLocationCode, IsDeleted, CreatedAtUtc, CreatedBy)
                OUTPUT INSERTED.EmployeeId
                VALUES
                  (@code, @first, @middle, @last, @dob, @gender, @officialEmail, @personalEmail,
                   @pan, @panMasked, @contact, @contactLast4, 1,
                   @designationId, @departmentId, @managerId, @doj, 'Active', @employmentType,
                   @workLocation, 0, SYSUTCDATETIME(), @createdBy)`);
      const employeeId = empResult.recordset[0].EmployeeId as number;

      const temporaryPassword = generateTemporaryPassword();
      const passwordHash = await hashPassword(temporaryPassword);
      const userResult = await new sql.Request(transaction)
        .input("employeeId", sql.Int, employeeId)
        .input("userName", sql.NVarChar(200), d.officialEmail)
        .input("normalized", sql.NVarChar(200), d.officialEmail.toUpperCase())
        .input("hash", sql.NVarChar(1000), passwordHash)
        .input("createdBy", sql.Int, req.user!.userId)
        .query(`INSERT INTO core.Users
                  (UserGuid, EmployeeId, UserName, NormalizedUserName, PasswordHash, SecurityStamp, IsActive,
                   MustChangePassword, MfaEnabled, FailedLoginCount, CreatedAtUtc, CreatedBy)
                OUTPUT INSERTED.UserId
                VALUES
                  (NEWID(), @employeeId, @userName, @normalized, @hash, NEWID(), 1, 1, 0, 0, SYSUTCDATETIME(), @createdBy)`);
      const userId = userResult.recordset[0].UserId as number;

      await new sql.Request(transaction)
        .input("userId", sql.Int, userId)
        .input("assignedBy", sql.Int, req.user!.userId)
        .query(`INSERT INTO core.UserRoles (UserId, RoleId, AssignedAtUtc, AssignedBy)
                SELECT @userId, RoleId, SYSUTCDATETIME(), @assignedBy FROM core.Roles WHERE RoleCode = 'EMPLOYEE'`);

      await transaction.commit();

      const row = await fetchEmployee(employeeId);
      res.status(201).json({ ...serialize(row!, false), temporaryPassword });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

const updateSchema = createSchema.partial().extend({
  employmentStatus: z.enum(["Active", "Exited", "OnLeave", "Suspended"]).optional(),
  dateOfExit: z.string().optional().nullable(),
});

employeesRouter.put("/employees/:id", requirePermission("employee.write"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ApiError(400, "Invalid employee id");
    const existing = await fetchEmployee(id);
    if (!existing) throw new ApiError(404, "Employee not found");

    const body = updateSchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, body.error.issues[0]?.message ?? "Invalid request body");
    const d = body.data;

    const pool = await getPool();
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("first", sql.NVarChar(120), d.firstName ?? existing.FirstName)
      .input("middle", sql.NVarChar(120), d.middleName !== undefined ? d.middleName : existing.MiddleName)
      .input("last", sql.NVarChar(120), d.lastName ?? existing.LastName)
      .input("personalEmail", sql.NVarChar(200), d.personalEmail !== undefined ? d.personalEmail : existing.PersonalEmail)
      .input("pan", sql.VarBinary, d.pan ? encryptField(d.pan.toUpperCase()) : existing.PanEncrypted)
      .input("panMasked", sql.NVarChar(24), d.pan ? maskPan(d.pan) : null)
      .input("contact", sql.VarBinary, d.contactNo ? encryptField(d.contactNo) : existing.ContactNoEncrypted)
      .input("contactLast4", sql.Char(4), d.contactNo ? d.contactNo.slice(-4) : null)
      .input("designationId", sql.Int, d.designationId ?? null)
      .input("departmentId", sql.Int, d.departmentId ?? null)
      .input("managerId", sql.Int, d.managerId ?? null)
      .input("employmentStatus", sql.VarChar(20), d.employmentStatus ?? existing.EmploymentStatus)
      .input("dateOfExit", sql.Date, d.dateOfExit ?? existing.DateOfExit)
      .input("modifiedBy", sql.Int, req.user!.userId)
      .query(`UPDATE hr.Employees SET
                FirstName = @first, MiddleName = @middle, LastName = @last, PersonalEmail = @personalEmail,
                PanEncrypted = @pan, PanMasked = COALESCE(@panMasked, PanMasked),
                ContactNoEncrypted = @contact, ContactNoLast4 = COALESCE(@contactLast4, ContactNoLast4),
                DesignationId = COALESCE(@designationId, DesignationId),
                DepartmentId = COALESCE(@departmentId, DepartmentId),
                ManagerId = COALESCE(@managerId, ManagerId),
                EmploymentStatus = @employmentStatus, DateOfExit = @dateOfExit,
                ModifiedAtUtc = SYSUTCDATETIME(), ModifiedBy = @modifiedBy
              WHERE EmployeeId = @id`);

    const row = await fetchEmployee(id);
    res.json(serialize(row!, false));
  } catch (err) {
    next(err);
  }
});

// Always audit-logged, regardless of which branch grants access — this is the one
// endpoint where every call must leave a trail, not just the ones that succeed
// via the HR path.
employeesRouter.post("/employees/:id/reveal-pan", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ApiError(400, "Invalid employee id");
    const row = await fetchEmployee(id);
    if (!row) throw new ApiError(404, "Employee not found");

    const isSelf = req.user!.employeeId === id;
    const isHrAdmin = req.user!.permissions.includes("employee.read.all");
    const isDirectManager = req.user!.employeeId != null && row.ManagerId === req.user!.employeeId;
    const canRevealAtAll = req.user!.permissions.includes("employee.pan.reveal");

    const allowed = isSelf || isHrAdmin || (isDirectManager && canRevealAtAll);
    if (!allowed) throw new ApiError(403, "You do not have access to this employee's PAN");

    await logAccess({
      actorUserId: req.user!.userId,
      action: "PAN_REVEALED",
      targetEmployeeId: id,
      details: isSelf ? "Self-service PAN reveal" : `PAN revealed by ${isHrAdmin ? "HR admin" : "manager"}`,
      ipAddress: req.ip,
    });

    res.json({ pan: row.PanEncrypted ? decryptField(row.PanEncrypted) : null });
  } catch (err) {
    next(err);
  }
});
