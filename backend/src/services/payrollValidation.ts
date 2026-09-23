import { Decimal } from "decimal.js";
import { Money } from "../utils/money.js";

export type Severity = "Error" | "Warning" | "Ok";

export interface ValidationCode {
  code: string;
  severity: Severity;
  message: string;
}

export interface SalaryComponentDef {
  componentId: number;
  code: string;
  name: string;
  type: "E" | "D" | "I";
  excelHeaderName: string;
}

export interface EmployeeMasterRow {
  employeeId: number;
  employmentStatus: string;
  dateOfExit: Date | null;
  dateOfJoining: Date;
}

export interface BatchContext {
  periodYear: number;
  periodMonth: number;
  periodStatus: "Open" | "Locked" | "Published";
  templateVersion: string;
  knownTemplateVersion: string;
  employeesByCode: Map<string, EmployeeMasterRow>;
  activeComponents: SalaryComponentDef[];
  priorNetPayByEmployeeId: Map<number, Money>;
  declaredControlTotalNet: Money;
}

export interface RawRow {
  excelRowNumber: number;
  employeeCode: string | null;
  paidDaysRaw: unknown;
  lopDaysRaw: unknown;
  amountsByHeader: Record<string, unknown>;
  unknownHeaders: string[];
}

export interface StagedRow {
  excelRowNumber: number;
  employeeCode: string | null;
  resolvedEmployeeId: number | null;
  paidDays: string | null;
  lopDays: string | null;
  computedGross: string | null;
  computedDeduct: string | null;
  computedNet: string | null;
  codes: ValidationCode[];
  severity: Severity;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function worstSeverity(codes: ValidationCode[]): Severity {
  if (codes.some((c) => c.severity === "Error")) return "Error";
  if (codes.some((c) => c.severity === "Warning")) return "Warning";
  return "Ok";
}

function isNumeric(value: unknown): value is number | string {
  if (value == null || value === "") return false;
  return !Number.isNaN(Number(value));
}

/** PAY001-PAY008, PAY011: per-row rules. Component-level rounding happens here,
 * then amounts are summed via Money — never sum-then-round. */
export function validateRow(row: RawRow, ctx: BatchContext, seenCodes: Set<string>): StagedRow {
  const codes: ValidationCode[] = [];
  const code = row.employeeCode?.trim() || null;

  if (!code) {
    codes.push({ code: "PAY001", severity: "Error", message: "EmployeeCode is blank" });
  }

  let master: EmployeeMasterRow | undefined;
  if (code) {
    master = ctx.employeesByCode.get(code.toUpperCase());
    if (!master) {
      codes.push({ code: "PAY002", severity: "Error", message: `EmployeeCode ${code} not found in the employee master` });
    }
  }

  if (code) {
    if (seenCodes.has(code.toUpperCase())) {
      codes.push({ code: "PAY004", severity: "Error", message: `Duplicate EmployeeCode ${code} in this file` });
    } else {
      seenCodes.add(code.toUpperCase());
    }
  }

  if (master?.employmentStatus === "Exited" && master.dateOfExit) {
    const periodStart = new Date(ctx.periodYear, ctx.periodMonth - 1, 1);
    if (master.dateOfExit < periodStart) {
      codes.push({ code: "PAY003", severity: "Error", message: "Employee exited before this pay period" });
    }
  }

  // PAY005/PAY006: component-level, rounded on read (round-half-away-from-zero),
  // then summed via Money — the whole point of PAY012's rounding rule.
  let gross = Money.zero();
  let deduct = Money.zero();
  let hasNonNumeric = false;
  for (const comp of ctx.activeComponents) {
    const raw = row.amountsByHeader[comp.excelHeaderName];
    if (raw == null || raw === "") continue;
    if (!isNumeric(raw)) {
      hasNonNumeric = true;
      continue;
    }
    const rounded = roundHalfAwayFromZero(Number(raw), 2);
    if (comp.type === "E") {
      if (rounded < 0) {
        codes.push({ code: "PAY006", severity: "Error", message: `Negative earning amount in ${comp.excelHeaderName}` });
      }
      gross = gross.plus(Money.fromDb(rounded.toFixed(2)));
    } else if (comp.type === "D") {
      deduct = deduct.plus(Money.fromDb(rounded.toFixed(2)));
    }
  }
  if (hasNonNumeric) {
    codes.push({ code: "PAY005", severity: "Error", message: "Non-numeric value in an amount column" });
  }
  const net = gross.minus(deduct);
  if (net.isNegative()) {
    codes.push({ code: "PAY007", severity: "Error", message: "Computed net pay is negative" });
  }

  const paidDays = isNumeric(row.paidDaysRaw) ? Number(row.paidDaysRaw) : null;
  const lopDays = isNumeric(row.lopDaysRaw) ? Number(row.lopDaysRaw) : null;
  const dim = daysInMonth(ctx.periodYear, ctx.periodMonth);
  if (paidDays == null || paidDays < 0 || paidDays > 31 || (lopDays != null && paidDays + lopDays > dim)) {
    codes.push({ code: "PAY008", severity: "Error", message: `PaidDays/LopDays out of range for a ${dim}-day period` });
  }

  if (ctx.periodStatus === "Locked") {
    codes.push({ code: "PAY009", severity: "Error", message: "This payroll period is locked" });
  }
  if (ctx.templateVersion !== ctx.knownTemplateVersion) {
    codes.push({ code: "PAY010", severity: "Error", message: `Unknown template version ${ctx.templateVersion}` });
  }

  if (master) {
    const periodStart = new Date(ctx.periodYear, ctx.periodMonth - 1, 1);
    const periodEnd = new Date(ctx.periodYear, ctx.periodMonth, 0);
    if (master.dateOfJoining >= periodStart && master.dateOfJoining <= periodEnd) {
      codes.push({ code: "PAY011", severity: "Warning", message: "Employee joined during this period; pro-rata expected" });
    }
    const prior = ctx.priorNetPayByEmployeeId.get(master.employeeId);
    if (prior && !prior.equals(Money.zero())) {
      const priorNum = Number(prior.toDbString());
      const netNum = Number(net.toDbString());
      if (Math.abs(netNum - priorNum) / Math.abs(priorNum) > 0.4) {
        codes.push({ code: "PAY012", severity: "Warning", message: "Net pay differs from previous month by more than 40%" });
      }
    }
  }

  return {
    excelRowNumber: row.excelRowNumber,
    employeeCode: code,
    resolvedEmployeeId: master?.employeeId ?? null,
    paidDays: paidDays != null ? paidDays.toFixed(2) : null,
    lopDays: lopDays != null ? lopDays.toFixed(2) : null,
    computedGross: gross.toDbString(),
    computedDeduct: deduct.toDbString(),
    computedNet: net.toDbString(),
    codes,
    severity: worstSeverity(codes),
  };
}

/** PAY013-PAY016: whole-file rules, attached to a synthetic row 0. */
export function validateBatch(
  rows: RawRow[],
  stagedRows: StagedRow[],
  ctx: BatchContext,
): { codes: ValidationCode[]; computedTotalNet: string } {
  const codes: ValidationCode[] = [];

  const unknown = new Set<string>();
  for (const r of rows) for (const h of r.unknownHeaders) unknown.add(h);
  for (const h of unknown) {
    codes.push({ code: "PAY013", severity: "Warning", message: `Unknown column header "${h}" was ignored` });
  }

  const seenHeaders = new Set(rows.flatMap((r) => Object.keys(r.amountsByHeader)));
  for (const comp of ctx.activeComponents) {
    if (!seenHeaders.has(comp.excelHeaderName)) {
      codes.push({ code: "PAY014", severity: "Warning", message: `Active component "${comp.excelHeaderName}" is absent from the file` });
    }
  }

  const fileCodes = new Set(rows.map((r) => r.employeeCode?.trim().toUpperCase()).filter(Boolean));
  for (const [empCode] of ctx.employeesByCode) {
    if (!fileCodes.has(empCode)) {
      codes.push({ code: "PAY015", severity: "Warning", message: `Active employee ${empCode} is missing from the file` });
    }
  }

  let computedTotalNet = Money.zero();
  for (const row of stagedRows) {
    if (row.resolvedEmployeeId && row.computedNet) computedTotalNet = computedTotalNet.plus(Money.fromDb(row.computedNet));
  }
  if (!computedTotalNet.equals(ctx.declaredControlTotalNet)) {
    codes.push({
      code: "PAY016",
      severity: "Error",
      message: `Control total ${ctx.declaredControlTotalNet.toDbString()} does not match computed total ${computedTotalNet.toDbString()}`,
    });
  }

  return { codes, computedTotalNet: computedTotalNet.toDbString() };
}

// Round-half-away-from-zero to `dp` decimal places — the rounding rule the spec
// requires. Uses Decimal.js rather than float math: raw JS `Math.round(1.005*100)`
// gives 100 (not 101) because 1.005 isn't exactly representable in a double.
export function roundHalfAwayFromZero(value: number, dp: number): number {
  return new Decimal(value).toDecimalPlaces(dp, Decimal.ROUND_HALF_UP).toNumber();
}
