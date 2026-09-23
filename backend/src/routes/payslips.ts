import path from "node:path";
import { Router } from "express";
import { getPool, sql } from "../config/db.js";
import { env } from "../config/env.js";
import { requirePermission } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { logAccess } from "../services/auditService.js";
import { maskLast4 } from "../utils/masking.js";

export const payslipsRouter = Router();

const PERIOD_SQL = `SELECT p.PayslipId, per.PeriodYear, per.PeriodMonth, p.PaidDays, p.LopDays,
       p.GrossEarnings, p.TotalDeductions, p.NetPay, p.NetPayInWords, p.BankAccLast4, p.PublishedUtc
     FROM payroll.Payslips p JOIN payroll.PayrollPeriods per ON per.PeriodId = p.PeriodId
     WHERE p.EmployeeId = @emp AND p.IsCurrent = 1 AND p.PublishedUtc IS NOT NULL`;

// Employees only ever see their own published, current payslips.
payslipsRouter.get("/payslips/me", async (req, res, next) => {
  try {
    if (!req.user!.employeeId) throw new ApiError(404, "No employee profile linked to this user");
    const pool = await getPool();
    const r = await pool
      .request()
      .input("emp", sql.Int, req.user!.employeeId)
      .query(`${PERIOD_SQL} ORDER BY per.PeriodYear DESC, per.PeriodMonth DESC`);
    res.json(
      r.recordset.map((p) => ({
        id: p.PayslipId,
        year: p.PeriodYear,
        month: p.PeriodMonth,
        paidDays: p.PaidDays,
        lopDays: p.LopDays,
        grossEarnings: p.GrossEarnings,
        totalDeductions: p.TotalDeductions,
        netPay: p.NetPay,
        netPayInWords: p.NetPayInWords,
        bankAccount: maskLast4(p.BankAccLast4),
        publishedAt: p.PublishedUtc,
      })),
    );
  } catch (err) {
    next(err);
  }
});

payslipsRouter.get("/payslips/me/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ApiError(400, "Invalid payslip id");
    const pool = await getPool();
    const head = await pool
      .request()
      .input("emp", sql.Int, req.user!.employeeId)
      .input("id", sql.Int, id)
      .query(`${PERIOD_SQL} AND p.PayslipId = @id`);
    if (!head.recordset[0]) throw new ApiError(404, "Payslip not found");
    const comps = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`SELECT c.ComponentName, c.ComponentType, pc.Amount
              FROM payroll.PayslipComponents pc JOIN payroll.SalaryComponents c ON c.ComponentId = pc.ComponentId
              WHERE pc.PayslipId = @id ORDER BY c.DisplaySequence`);
    const p = head.recordset[0];
    res.json({
      id: p.PayslipId,
      year: p.PeriodYear,
      month: p.PeriodMonth,
      netPay: p.NetPay,
      netPayInWords: p.NetPayInWords,
      components: comps.recordset.map((c) => ({
        name: c.ComponentName,
        type: c.ComponentType === "E" ? "earning" : "deduction",
        amount: c.Amount,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/payslips — the admin register, filterable by year/month/employee code.
payslipsRouter.get("/payslips", requirePermission("payslip.read.all"), async (req, res, next) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const conditions = ["p.IsCurrent = 1"];
    if (req.query.year) {
      request.input("year", sql.SmallInt, Number(req.query.year));
      conditions.push("per.PeriodYear = @year");
    }
    if (req.query.month) {
      request.input("month", sql.TinyInt, Number(req.query.month));
      conditions.push("per.PeriodMonth = @month");
    }
    if (req.query.employeeCode) {
      request.input("code", sql.NVarChar(40), String(req.query.employeeCode));
      conditions.push("e.EmployeeCode = @code");
    }
    const r = await request.query(`
      SELECT p.PayslipId, e.EmployeeCode, e.FullName, per.PeriodYear, per.PeriodMonth,
             p.GrossEarnings, p.TotalDeductions, p.NetPay, p.PublishedUtc
      FROM payroll.Payslips p
      JOIN payroll.PayrollPeriods per ON per.PeriodId = p.PeriodId
      JOIN hr.Employees e ON e.EmployeeId = p.EmployeeId
      WHERE ${conditions.join(" AND ")}
      ORDER BY per.PeriodYear DESC, per.PeriodMonth DESC, e.EmployeeCode`);
    res.json(
      r.recordset.map((p) => ({
        id: p.PayslipId,
        employeeCode: p.EmployeeCode,
        fullName: p.FullName,
        year: p.PeriodYear,
        month: p.PeriodMonth,
        grossEarnings: p.GrossEarnings,
        totalDeductions: p.TotalDeductions,
        netPay: p.NetPay,
        publishedAt: p.PublishedUtc,
      })),
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/payslips/:id/download — 100% of downloads are audited, not just PAN reveals.
payslipsRouter.get("/payslips/:id/download", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ApiError(400, "Invalid payslip id");

    const pool = await getPool();
    const r = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`SELECT p.EmployeeId, f.StorageKey, f.OriginalFileName, f.ContentType
              FROM payroll.Payslips p LEFT JOIN core.Files f ON f.FileId = p.PdfFileId
              WHERE p.PayslipId = @id`);
    const row = r.recordset[0];
    if (!row) throw new ApiError(404, "Payslip not found");
    if (!row.StorageKey) throw new ApiError(404, "No PDF has been generated for this payslip yet");

    const isOwner = req.user!.employeeId === row.EmployeeId;
    const canReadAll = req.user!.permissions.includes("payslip.read.all");
    if (!isOwner && !canReadAll) throw new ApiError(403, "You do not have access to this payslip");

    await logAccess({
      actorUserId: req.user!.userId,
      action: "PAYSLIP_DOWNLOADED",
      targetEmployeeId: row.EmployeeId,
      details: `Payslip ${id} downloaded`,
      ipAddress: req.ip,
    });

    res.download(path.join(env.PAYSLIP_STORAGE_PATH, row.StorageKey), row.OriginalFileName);
  } catch (err) {
    next(err);
  }
});
