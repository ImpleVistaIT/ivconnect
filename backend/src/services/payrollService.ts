import ExcelJS from "exceljs";
import { getPool, sql } from "../config/db.js";
import { Money } from "../utils/money.js";
import type { BatchContext, EmployeeMasterRow, RawRow, SalaryComponentDef, StagedRow } from "./payrollValidation.js";

export const FIXED_HEADERS = ["EmployeeCode", "PaidDays", "LOPDays"] as const;

export async function fetchActiveComponents(): Promise<SalaryComponentDef[]> {
  const pool = await getPool();
  const r = await pool
    .request()
    .query(`SELECT ComponentId, ComponentCode, ComponentName, ComponentType, ExcelHeaderName
            FROM payroll.SalaryComponents WHERE IsActive = 1 ORDER BY DisplaySequence`);
  return r.recordset.map((c) => ({
    componentId: c.ComponentId,
    code: c.ComponentCode,
    name: c.ComponentName,
    type: c.ComponentType,
    excelHeaderName: c.ExcelHeaderName,
  }));
}

export async function fetchActiveEmployees(): Promise<{ employeeCode: string; employeeId: number }[]> {
  const pool = await getPool();
  const r = await pool
    .request()
    .query(`SELECT EmployeeId, EmployeeCode FROM hr.Employees WHERE IsDeleted = 0 AND EmploymentStatus = 'Active' ORDER BY EmployeeCode`);
  return r.recordset.map((e) => ({ employeeCode: e.EmployeeCode, employeeId: e.EmployeeId }));
}

export async function fetchEmployeeMasterByCode(): Promise<Map<string, EmployeeMasterRow>> {
  const pool = await getPool();
  const r = await pool
    .request()
    .query(`SELECT EmployeeId, EmployeeCode, EmploymentStatus, DateOfExit, DateOfJoining FROM hr.Employees WHERE IsDeleted = 0`);
  const map = new Map<string, EmployeeMasterRow>();
  for (const e of r.recordset) {
    map.set(e.EmployeeCode.toUpperCase(), {
      employeeId: e.EmployeeId,
      employmentStatus: e.EmploymentStatus,
      dateOfExit: e.DateOfExit,
      dateOfJoining: e.DateOfJoining,
    });
  }
  return map;
}

export async function findOrCreatePeriod(year: number, month: number, createdBy: number): Promise<{ periodId: number; status: string }> {
  const pool = await getPool();
  const existing = await pool
    .request()
    .input("y", sql.SmallInt, year)
    .input("m", sql.TinyInt, month)
    .query("SELECT PeriodId, Status FROM payroll.PayrollPeriods WHERE PeriodYear = @y AND PeriodMonth = @m");
  if (existing.recordset[0]) return { periodId: existing.recordset[0].PeriodId, status: existing.recordset[0].Status };

  const created = await pool
    .request()
    .input("y", sql.SmallInt, year)
    .input("m", sql.TinyInt, month)
    .input("createdBy", sql.Int, createdBy)
    .query(`INSERT INTO payroll.PayrollPeriods (PeriodYear, PeriodMonth, Status, CreatedAtUtc, CreatedBy)
            OUTPUT INSERTED.PeriodId, INSERTED.Status
            VALUES (@y, @m, 'Open', SYSUTCDATETIME(), @createdBy)`);
  return { periodId: created.recordset[0].PeriodId, status: created.recordset[0].Status };
}

export async function fetchPriorNetPay(periodYear: number, periodMonth: number): Promise<Map<number, Money>> {
  const pool = await getPool();
  const prevMonth = periodMonth === 1 ? 12 : periodMonth - 1;
  const prevYear = periodMonth === 1 ? periodYear - 1 : periodYear;
  const r = await pool
    .request()
    .input("y", sql.SmallInt, prevYear)
    .input("m", sql.TinyInt, prevMonth)
    .query(`SELECT p.EmployeeId, p.NetPay FROM payroll.Payslips p
            JOIN payroll.PayrollPeriods per ON per.PeriodId = p.PeriodId
            WHERE per.PeriodYear = @y AND per.PeriodMonth = @m AND p.IsCurrent = 1`);
  const map = new Map<number, Money>();
  for (const row of r.recordset) map.set(row.EmployeeId, Money.fromDb(row.NetPay));
  return map;
}

export async function generateTemplateWorkbook(): Promise<ExcelJS.Buffer> {
  const [components, employees] = await Promise.all([fetchActiveComponents(), fetchActiveEmployees()]);
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Payroll");
  const headers = [...FIXED_HEADERS, ...components.map((c) => c.excelHeaderName)];
  sheet.addRow(headers);
  for (const e of employees) sheet.addRow([e.employeeCode]);
  return wb.xlsx.writeBuffer();
}

export interface ParsedWorkbook {
  templateVersion: string;
  rows: RawRow[];
}

export async function parseUploadedWorkbook(buffer: Buffer, activeComponents: SalaryComponentDef[]): Promise<ParsedWorkbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = wb.worksheets[0];
  if (!sheet) return { templateVersion: "unknown", rows: [] };

  const headerRow = sheet.getRow(1);
  const headerByCol = new Map<number, string>();
  headerRow.eachCell((cell, colNumber) => {
    const value = String(cell.value ?? "").trim();
    if (value) headerByCol.set(colNumber, value);
  });

  const knownHeaderNames = new Set<string>([...FIXED_HEADERS, ...activeComponents.map((c) => c.excelHeaderName)]);
  const rows: RawRow[] = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (row.cellCount === 0 || row.values == null || (Array.isArray(row.values) && row.values.every((v) => v == null))) continue;

    let employeeCode: string | null = null;
    let paidDaysRaw: unknown;
    let lopDaysRaw: unknown;
    const amountsByHeader: Record<string, unknown> = {};
    const unknownHeaders: string[] = [];

    for (const [colNumber, header] of headerByCol) {
      const cellValue = row.getCell(colNumber).value;
      const value = cellValue && typeof cellValue === "object" && "result" in cellValue ? (cellValue as { result: unknown }).result : cellValue;
      if (header === "EmployeeCode") employeeCode = value != null ? String(value).trim() : null;
      else if (header === "PaidDays") paidDaysRaw = value;
      else if (header === "LOPDays") lopDaysRaw = value;
      else if (knownHeaderNames.has(header)) amountsByHeader[header] = value;
      else unknownHeaders.push(header);
    }

    rows.push({ excelRowNumber: rowNumber, employeeCode, paidDaysRaw, lopDaysRaw, amountsByHeader, unknownHeaders });
  }

  return { templateVersion: "1.0", rows };
}

export async function generateErrorsWorkbook(staged: StagedRow[]): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Errors");
  sheet.addRow(["Row", "EmployeeCode", "Codes", "Messages"]);
  for (const row of staged) {
    const errorCodes = row.codes.filter((c) => c.severity === "Error");
    if (errorCodes.length === 0) continue;
    sheet.addRow([row.excelRowNumber, row.employeeCode ?? "", errorCodes.map((c) => c.code).join(", "), errorCodes.map((c) => c.message).join(" | ")]);
  }
  return wb.xlsx.writeBuffer();
}
