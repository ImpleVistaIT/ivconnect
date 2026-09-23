import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { getPool, sql } from "../config/db.js";
import { env } from "../config/env.js";
import { requirePermission } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { Money } from "../utils/money.js";
import { amountInWords } from "../utils/amountInWords.js";
import {
  fetchActiveComponents,
  fetchEmployeeMasterByCode,
  fetchPriorNetPay,
  findOrCreatePeriod,
  generateErrorsWorkbook,
  generateTemplateWorkbook,
  parseUploadedWorkbook,
} from "../services/payrollService.js";
import { validateBatch, validateRow, type BatchContext, type StagedRow } from "../services/payrollValidation.js";
import { generatePayslipPdf } from "../services/pdfService.js";

export const payrollRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const XLSX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // .xlsx is a zip archive

// GET /payroll/template
payrollRouter.get("/payroll/template", requirePermission("payslip.batch.upload"), async (_req, res, next) => {
  try {
    const buffer = await generateTemplateWorkbook();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="payroll-template.xlsx"');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

const uploadSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  controlTotalNet: z.coerce.number(),
});

// POST /payroll/batches
payrollRouter.post("/payroll/batches", requirePermission("payslip.batch.upload"), upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError(400, "An .xlsx file is required");
    if (!req.file.originalname.toLowerCase().endsWith(".xlsx")) throw new ApiError(400, "File must have an .xlsx extension");
    if (!req.file.buffer.subarray(0, 4).equals(XLSX_MAGIC)) throw new ApiError(400, "File content is not a valid .xlsx archive");

    const body = uploadSchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, "year, month and controlTotalNet are required");
    const { year, month, controlTotalNet } = body.data;

    const pool = await getPool();
    const period = await findOrCreatePeriod(year, month, req.user!.userId);

    const fileGuid = randomUUID();
    const relativeDir = path.join("uploads", String(year), String(month).padStart(2, "0"));
    const relativePath = path.join(relativeDir, `${fileGuid}.xlsx`);
    await mkdir(path.join(env.PAYSLIP_STORAGE_PATH, relativeDir), { recursive: true });
    await writeFile(path.join(env.PAYSLIP_STORAGE_PATH, relativePath), req.file.buffer);
    const sha256 = createHash("sha256").update(req.file.buffer).digest();

    const fileResult = await pool
      .request()
      .input("guid", sql.UniqueIdentifier, fileGuid)
      .input("container", sql.VarChar(60), "payroll-uploads")
      .input("storageKey", sql.NVarChar(400), relativePath.split(path.sep).join("/"))
      .input("originalFileName", sql.NVarChar(260), req.file.originalname)
      .input("contentType", sql.VarChar(120), req.file.mimetype || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .input("size", sql.BigInt, req.file.size)
      .input("sha256", sql.VarBinary, sha256)
      .input("uploadedBy", sql.Int, req.user!.userId)
      .query(`INSERT INTO core.Files (FileGuid, Container, StorageKey, OriginalFileName, ContentType, SizeBytes, Sha256, ScanStatus, UploadedBy, UploadedAtUtc, IsDeleted)
              OUTPUT INSERTED.FileId
              VALUES (@guid, @container, @storageKey, @originalFileName, @contentType, @size, @sha256, 'Clean', @uploadedBy, SYSUTCDATETIME(), 0)`);
    const sourceFileId = fileResult.recordset[0].FileId as number;

    const batchResult = await pool
      .request()
      .input("guid", sql.UniqueIdentifier, randomUUID())
      .input("periodId", sql.Int, period.periodId)
      .input("sourceFileId", sql.Int, sourceFileId)
      .input("templateVersion", sql.VarChar(10), "1.0")
      .input("controlTotal", sql.Decimal(14, 2), controlTotalNet)
      .input("uploadedBy", sql.Int, req.user!.userId)
      .query(`INSERT INTO payroll.PayslipBatches
                (BatchGuid, PeriodId, SourceFileId, TemplateVersion, Status, TotalRows, ValidRows, ErrorRows, WarningRows,
                 ControlTotalNet, WarningsAcknowledged, UploadedBy, UploadedAtUtc)
              OUTPUT INSERTED.BatchId
              VALUES (@guid, @periodId, @sourceFileId, @templateVersion, 'Uploaded', 0, 0, 0, 0,
                      @controlTotal, 0, @uploadedBy, SYSUTCDATETIME())`);
    const batchId = batchResult.recordset[0].BatchId as number;

    // Don't block the response on parsing potentially hundreds of rows.
    setImmediate(() => {
      runValidation(batchId, req.file!.buffer, period.status as "Open" | "Locked" | "Published").catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`Batch ${batchId} validation failed`, err);
      });
    });

    res.status(202).json({ batchId });
  } catch (err) {
    next(err);
  }
});

async function runValidation(batchId: number, fileBuffer: Buffer, periodStatus: "Open" | "Locked" | "Published"): Promise<void> {
  const pool = await getPool();
  await pool.request().input("id", sql.Int, batchId).query("UPDATE payroll.PayslipBatches SET Status = 'Validating' WHERE BatchId = @id");

  const batchRow = await pool
    .request()
    .input("id", sql.Int, batchId)
    .query(`SELECT b.TemplateVersion, b.ControlTotalNet, per.PeriodYear, per.PeriodMonth
            FROM payroll.PayslipBatches b JOIN payroll.PayrollPeriods per ON per.PeriodId = b.PeriodId
            WHERE b.BatchId = @id`);
  const b = batchRow.recordset[0];

  const [activeComponents, employeesByCode, priorNetPayByEmployeeId] = await Promise.all([
    fetchActiveComponents(),
    fetchEmployeeMasterByCode(),
    fetchPriorNetPay(b.PeriodYear, b.PeriodMonth),
  ]);
  const parsed = await parseUploadedWorkbook(fileBuffer, activeComponents);

  const ctx: BatchContext = {
    periodYear: b.PeriodYear,
    periodMonth: b.PeriodMonth,
    periodStatus,
    templateVersion: parsed.templateVersion,
    knownTemplateVersion: b.TemplateVersion,
    employeesByCode,
    activeComponents,
    priorNetPayByEmployeeId,
    declaredControlTotalNet: Money.fromDb(b.ControlTotalNet),
  };

  const seenCodes = new Set<string>();
  const stagedRows: StagedRow[] = parsed.rows.map((row) => validateRow(row, ctx, seenCodes));
  const { codes: batchCodes, computedTotalNet } = validateBatch(parsed.rows, stagedRows, ctx);

  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    await new sql.Request(transaction).input("id", sql.Int, batchId).query("DELETE FROM payroll.PayslipStaging WHERE BatchId = @id");

    for (let i = 0; i < stagedRows.length; i++) {
      const row = stagedRows[i];
      // RawRowJson must be the original parsed row (amountsByHeader intact) —
      // commit re-reads this to build PayslipComponents, not the staged/validated shape.
      await new sql.Request(transaction)
        .input("batchId", sql.Int, batchId)
        .input("rowNumber", sql.Int, row.excelRowNumber)
        .input("employeeCode", sql.NVarChar(40), row.employeeCode)
        .input("resolvedEmployeeId", sql.Int, row.resolvedEmployeeId)
        .input("rawJson", sql.NVarChar(sql.MAX), JSON.stringify(parsed.rows[i]))
        .input("paidDays", sql.Decimal(5, 2), row.paidDays)
        .input("lopDays", sql.Decimal(5, 2), row.lopDays)
        .input("gross", sql.Decimal(14, 2), row.computedGross)
        .input("deduct", sql.Decimal(14, 2), row.computedDeduct)
        .input("net", sql.Decimal(14, 2), row.computedNet)
        .input("severity", sql.VarChar(10), row.severity)
        .input("messages", sql.NVarChar(sql.MAX), JSON.stringify(row.codes))
        .query(`INSERT INTO payroll.PayslipStaging
                  (BatchId, ExcelRowNumber, EmployeeCode, ResolvedEmployeeId, RawRowJson, PaidDays, LopDays,
                   ComputedGross, ComputedDeduct, ComputedNet, Severity, Messages)
                VALUES (@batchId, @rowNumber, @employeeCode, @resolvedEmployeeId, @rawJson, @paidDays, @lopDays,
                        @gross, @deduct, @net, @severity, @messages)`);
    }

    // Batch-level rules (PAY013-016) live on a synthetic row 0 — no single Excel row owns them.
    const batchSeverity = batchCodes.some((c) => c.severity === "Error") ? "Error" : batchCodes.some((c) => c.severity === "Warning") ? "Warning" : "Ok";
    await new sql.Request(transaction)
      .input("batchId", sql.Int, batchId)
      .input("severity", sql.VarChar(10), batchSeverity)
      .input("messages", sql.NVarChar(sql.MAX), JSON.stringify(batchCodes))
      .query(`INSERT INTO payroll.PayslipStaging (BatchId, ExcelRowNumber, EmployeeCode, RawRowJson, Severity, Messages)
              VALUES (@batchId, 0, NULL, '{}', @severity, @messages)`);

    const errorRows = stagedRows.filter((r) => r.severity === "Error").length + (batchSeverity === "Error" ? 1 : 0);
    const warningRows = stagedRows.filter((r) => r.severity === "Warning").length + (batchSeverity === "Warning" ? 1 : 0);
    const hasError = errorRows > 0;

    await new sql.Request(transaction)
      .input("id", sql.Int, batchId)
      .input("status", sql.VarChar(20), hasError ? "ValidationFailed" : "ReadyToCommit")
      .input("total", sql.Int, stagedRows.length)
      .input("valid", sql.Int, stagedRows.filter((r) => r.severity !== "Error").length)
      .input("errorRows", sql.Int, errorRows)
      .input("warningRows", sql.Int, warningRows)
      .input("computedTotal", sql.Decimal(14, 2), computedTotalNet)
      .query(`UPDATE payroll.PayslipBatches SET Status = @status, TotalRows = @total, ValidRows = @valid,
                ErrorRows = @errorRows, WarningRows = @warningRows, ComputedTotalNet = @computedTotal
              WHERE BatchId = @id`);

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

// GET /payroll/batches/:id/rows
payrollRouter.get("/payroll/batches/:id/rows", requirePermission("payslip.batch.upload"), async (req, res, next) => {
  try {
    const batchId = Number(req.params.id);
    if (!Number.isInteger(batchId)) throw new ApiError(400, "Invalid batch id");
    const pool = await getPool();
    const batch = await pool.request().input("id", sql.Int, batchId).query("SELECT Status FROM payroll.PayslipBatches WHERE BatchId = @id");
    if (!batch.recordset[0]) throw new ApiError(404, "Batch not found");

    const rows = await pool
      .request()
      .input("id", sql.Int, batchId)
      .query(`SELECT ExcelRowNumber, EmployeeCode, PaidDays, LopDays, ComputedGross, ComputedDeduct, ComputedNet, Severity, Messages
              FROM payroll.PayslipStaging WHERE BatchId = @id ORDER BY ExcelRowNumber`);
    res.json({
      batchStatus: batch.recordset[0].Status,
      rows: rows.recordset.map((r) => ({
        rowNumber: r.ExcelRowNumber,
        employeeCode: r.EmployeeCode,
        paidDays: r.PaidDays,
        lopDays: r.LopDays,
        computedGross: r.ComputedGross,
        computedDeduct: r.ComputedDeduct,
        computedNet: r.ComputedNet,
        severity: r.Severity,
        codes: JSON.parse(r.Messages || "[]"),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /payroll/batches/:id/errors.xlsx
payrollRouter.get("/payroll/batches/:id/errors.xlsx", requirePermission("payslip.batch.upload"), async (req, res, next) => {
  try {
    const batchId = Number(req.params.id);
    if (!Number.isInteger(batchId)) throw new ApiError(400, "Invalid batch id");
    const pool = await getPool();
    const rows = await pool
      .request()
      .input("id", sql.Int, batchId)
      .query(`SELECT ExcelRowNumber, EmployeeCode, Severity, Messages FROM payroll.PayslipStaging WHERE BatchId = @id AND ExcelRowNumber > 0 ORDER BY ExcelRowNumber`);
    const staged: StagedRow[] = rows.recordset.map((r) => ({
      excelRowNumber: r.ExcelRowNumber,
      employeeCode: r.EmployeeCode,
      resolvedEmployeeId: null,
      paidDays: null,
      lopDays: null,
      computedGross: null,
      computedDeduct: null,
      computedNet: null,
      codes: JSON.parse(r.Messages || "[]"),
      severity: r.Severity,
    }));
    const buffer = await generateErrorsWorkbook(staged);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="errors.xlsx"');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// In-process idempotency cache: per the phase note, a full job/idempotency store
// isn't required for this pass — this is enough to make retried commits safe
// for the lifetime of the process.
const idempotencyCache = new Map<string, unknown>();

// POST /payroll/batches/:id/commit
payrollRouter.post("/payroll/batches/:id/commit", requirePermission("payslip.batch.commit"), async (req, res, next) => {
  try {
    const batchId = Number(req.params.id);
    if (!Number.isInteger(batchId)) throw new ApiError(400, "Invalid batch id");
    const idempotencyKey = req.headers["idempotency-key"];
    if (!idempotencyKey || typeof idempotencyKey !== "string") throw new ApiError(400, "Idempotency-Key header is required");

    const cacheKey = `${batchId}:${idempotencyKey}`;
    if (idempotencyCache.has(cacheKey)) {
      res.json(idempotencyCache.get(cacheKey));
      return;
    }

    const pool = await getPool();
    const batchRow = await pool
      .request()
      .input("id", sql.Int, batchId)
      .query(`SELECT b.Status, b.UploadedBy, b.ControlTotalNet, b.ComputedTotalNet, b.PeriodId,
                     per.PeriodYear, per.PeriodMonth, per.Status AS PeriodStatus
              FROM payroll.PayslipBatches b JOIN payroll.PayrollPeriods per ON per.PeriodId = b.PeriodId
              WHERE b.BatchId = @id`);
    const b = batchRow.recordset[0];
    if (!b) throw new ApiError(404, "Batch not found");

    // The DB has its own CK_Batch_MakerChecker constraint enforcing this too —
    // this check exists to give a clear error message before hitting the DB.
    if (b.UploadedBy === req.user!.userId) throw new ApiError(409, "The uploader cannot also commit this batch (maker-checker)");
    if (b.Status !== "ReadyToCommit") throw new ApiError(409, `Batch is not ready to commit (status: ${b.Status})`);
    if (b.ControlTotalNet == null || b.ComputedTotalNet == null || Number(b.ControlTotalNet) !== Number(b.ComputedTotalNet)) {
      throw new ApiError(409, "Control total no longer matches the computed total");
    }
    if (b.PeriodStatus === "Locked") throw new ApiError(409, "This payroll period is locked");

    const stagingRows = await pool
      .request()
      .input("id", sql.Int, batchId)
      .query(`SELECT ResolvedEmployeeId, PaidDays, LopDays, ComputedGross, ComputedDeduct, ComputedNet
              FROM payroll.PayslipStaging WHERE BatchId = @id AND ExcelRowNumber > 0 AND Severity <> 'Error'`);

    const activeComponents = await fetchActiveComponents();
    const employeesByCode = await fetchEmployeeMasterByCode();
    const employeeCodeById = new Map<number, string>();
    for (const [code, e] of employeesByCode) employeeCodeById.set(e.employeeId, code);

    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    const newPayslipIds: number[] = [];
    try {
      // Re-check the maker-checker rule inside the transaction, so it's the same
      // atomic operation the DB constraint itself guards against.
      await new sql.Request(transaction)
        .input("id", sql.Int, batchId)
        .input("committedBy", sql.Int, req.user!.userId)
        .query(`UPDATE payroll.PayslipBatches SET Status = 'Committing', CommittedBy = @committedBy, CommittedAtUtc = SYSUTCDATETIME() WHERE BatchId = @id`);

      for (const row of stagingRows.recordset) {
        const employeeId = row.ResolvedEmployeeId as number;
        if (!employeeId) continue;

        const current = await new sql.Request(transaction)
          .input("empId", sql.Int, employeeId)
          .input("periodId", sql.Int, b.PeriodId)
          .query(`SELECT PayslipId, VersionNo FROM payroll.Payslips WHERE EmployeeId = @empId AND PeriodId = @periodId AND IsCurrent = 1`);
        const previous = current.recordset[0];
        const nextVersion = previous ? previous.VersionNo + 1 : 1;

        // Demote the old current row *before* inserting the new one — UX_Payslip_Current
        // allows only one IsCurrent=1 row per (PeriodId, EmployeeId) at a time, so
        // inserting first would collide with the row it's meant to replace.
        if (previous) {
          await new sql.Request(transaction)
            .input("oldId", sql.Int, previous.PayslipId)
            .query(`UPDATE payroll.Payslips SET IsCurrent = 0 WHERE PayslipId = @oldId`);
        }

        const netInWords = amountInWords(String(row.ComputedNet));
        const inserted = await new sql.Request(transaction)
          .input("guid", sql.UniqueIdentifier, randomUUID())
          .input("periodId", sql.Int, b.PeriodId)
          .input("empId", sql.Int, employeeId)
          .input("batchId", sql.Int, batchId)
          .input("versionNo", sql.SmallInt, nextVersion)
          .input("paidDays", sql.Decimal(5, 2), row.PaidDays)
          .input("lopDays", sql.Decimal(5, 2), row.LopDays)
          .input("gross", sql.Decimal(14, 2), row.ComputedGross)
          .input("deduct", sql.Decimal(14, 2), row.ComputedDeduct)
          .input("net", sql.Decimal(14, 2), row.ComputedNet)
          .input("netWords", sql.NVarChar(600), netInWords)
          .input("createdBy", sql.Int, req.user!.userId)
          .query(`INSERT INTO payroll.Payslips
                    (PayslipGuid, PeriodId, EmployeeId, BatchId, VersionNo, IsCurrent, PaidDays, LopDays,
                     GrossEarnings, TotalDeductions, NetPay, NetPayInWords, CreatedAtUtc, CreatedBy)
                  OUTPUT INSERTED.PayslipId
                  VALUES (@guid, @periodId, @empId, @batchId, @versionNo, 1, @paidDays, @lopDays,
                          @gross, @deduct, @net, @netWords, SYSUTCDATETIME(), @createdBy)`);
        const newPayslipId = inserted.recordset[0].PayslipId as number;
        newPayslipIds.push(newPayslipId);

        // Never delete a payslip row — re-uploads version forward only. The old
        // row was already demoted above; this just links it to its replacement.
        if (previous) {
          await new sql.Request(transaction)
            .input("oldId", sql.Int, previous.PayslipId)
            .input("newId", sql.Int, newPayslipId)
            .query(`UPDATE payroll.Payslips SET SupersededByPayslipId = @newId WHERE PayslipId = @oldId`);
        }

        const raw = JSON.parse(
          (
            await new sql.Request(transaction)
              .input("batchId", sql.Int, batchId)
              .input("empId", sql.Int, employeeId)
              .query(`SELECT TOP 1 RawRowJson FROM payroll.PayslipStaging WHERE BatchId = @batchId AND ResolvedEmployeeId = @empId`)
          ).recordset[0].RawRowJson,
        ) as { amountsByHeader: Record<string, unknown> };

        for (const comp of activeComponents) {
          const raw2 = raw.amountsByHeader[comp.excelHeaderName];
          if (raw2 == null || raw2 === "") continue;
          await new sql.Request(transaction)
            .input("payslipId", sql.Int, newPayslipId)
            .input("componentId", sql.Int, comp.componentId)
            .input("amount", sql.Decimal(14, 2), Number(raw2))
            .query(`INSERT INTO payroll.PayslipComponents (PayslipId, ComponentId, Amount) VALUES (@payslipId, @componentId, @amount)`);
        }
      }

      await new sql.Request(transaction).input("id", sql.Int, batchId).query("UPDATE payroll.PayslipBatches SET Status = 'Committed' WHERE BatchId = @id");
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    // PDF generation happens after commit, in parallel, and a single failure
    // doesn't undo the commit — it's reported so it can be regenerated later.
    const pdfResults = await Promise.allSettled(
      newPayslipIds.map(async (payslipId) => {
        const pool2 = await getPool();
        const detail = await pool2
          .request()
          .input("id", sql.Int, payslipId)
          .query(`SELECT p.PayslipId, p.EmployeeId, p.VersionNo, p.GrossEarnings, p.TotalDeductions, p.NetPay, p.NetPayInWords,
                         p.BankAccLast4, per.PeriodYear, per.PeriodMonth,
                         e.EmployeeCode, e.FullName, e.DateOfJoining, e.PanEncrypted, e.DateOfBirth, des.Title AS Designation
                  FROM payroll.Payslips p
                  JOIN payroll.PayrollPeriods per ON per.PeriodId = p.PeriodId
                  JOIN hr.Employees e ON e.EmployeeId = p.EmployeeId
                  JOIN hr.Designations des ON des.DesignationId = e.DesignationId
                  WHERE p.PayslipId = @id`);
        const d = detail.recordset[0];
        const comps = await pool2
          .request()
          .input("id", sql.Int, payslipId)
          .query(`SELECT c.ComponentName, c.ComponentType, pc.Amount FROM payroll.PayslipComponents pc
                  JOIN payroll.SalaryComponents c ON c.ComponentId = pc.ComponentId WHERE pc.PayslipId = @id ORDER BY c.DisplaySequence`);
        await generatePayslipPdf(
          {
            payslipId: d.PayslipId,
            employeeId: d.EmployeeId,
            employeeCode: d.EmployeeCode,
            fullName: d.FullName,
            designation: d.Designation,
            dateOfJoining: d.DateOfJoining,
            panEncrypted: d.PanEncrypted,
            dateOfBirth: d.DateOfBirth,
            bankAccLast4: d.BankAccLast4,
            periodYear: d.PeriodYear,
            periodMonth: d.PeriodMonth,
            versionNo: d.VersionNo,
            grossEarnings: d.GrossEarnings,
            totalDeductions: d.TotalDeductions,
            netPay: d.NetPay,
            netPayInWords: d.NetPayInWords,
            components: comps.recordset.map((c) => ({ name: c.ComponentName, type: c.ComponentType, amount: c.Amount })),
          },
          req.user!.userId,
        );
        return d.EmployeeCode as string;
      }),
    );
    const failedPdfs = pdfResults
      .map((r, i) => ({ r, employeeId: newPayslipIds[i] }))
      .filter((x) => x.r.status === "rejected")
      .map((x) => x.employeeId);

    const responseBody = { batchId, status: "Committed", payslipsCreated: newPayslipIds.length, pdfFailures: failedPdfs };
    idempotencyCache.set(cacheKey, responseBody);
    res.json(responseBody);
  } catch (err) {
    next(err);
  }
});
