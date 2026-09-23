import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import { getPool, sql } from "../config/db.js";
import { env } from "../config/env.js";
import { decryptField } from "../utils/encryption.js";
import { maskPan, maskLast4 } from "../utils/masking.js";
import { amountInWords } from "../utils/amountInWords.js";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function buildPdfPassword(pan: string, dateOfBirth: Date): string {
  const panPrefix = pan.trim().toUpperCase().slice(0, 4);
  const dd = String(dateOfBirth.getDate()).padStart(2, "0");
  const mm = String(dateOfBirth.getMonth() + 1).padStart(2, "0");
  return `${panPrefix}${dd}${mm}`;
}

interface PayslipPdfInput {
  payslipId: number;
  employeeId: number;
  employeeCode: string;
  fullName: string;
  designation: string;
  dateOfJoining: Date;
  panEncrypted: Buffer | null;
  dateOfBirth: Date | null;
  bankAccLast4: string | null;
  periodYear: number;
  periodMonth: number;
  versionNo: number;
  grossEarnings: string;
  totalDeductions: string;
  netPay: string;
  netPayInWords: string;
  components: { name: string; type: "E" | "D" | "I"; amount: string }[];
}

export interface PdfGenerationResult {
  fileId: number;
  storageKey: string;
}

async function passwordProtectionEnabled(): Promise<boolean> {
  const pool = await getPool();
  const r = await pool.request().query("SELECT SettingValue FROM core.AppSettings WHERE SettingKey = 'Payroll.PdfPasswordEnabled'");
  return (r.recordset[0]?.SettingValue ?? "false").toLowerCase() === "true";
}

function renderPdf(input: PayslipPdfInput, doc: PDFKit.PDFDocument): void {
  const monthLabel = `${MONTH_NAMES[input.periodMonth - 1]} ${input.periodYear}`;

  doc.fontSize(16).text("IV Connect", { align: "left" });
  doc.fontSize(10).text(`Payslip for the month of ${monthLabel}`, { align: "left" });
  doc.moveDown(1);

  doc.fontSize(11).text("Employee Details", { underline: true });
  doc.fontSize(10);
  doc.text(`Employee Code: ${input.employeeCode}`);
  doc.text(`Name: ${input.fullName}`);
  doc.text(`Designation: ${input.designation}`);
  doc.text(`Date of Joining: ${input.dateOfJoining.toISOString().slice(0, 10)}`);
  if (input.panEncrypted) doc.text(`PAN: ${maskPan(decryptField(input.panEncrypted))}`);
  if (input.bankAccLast4) doc.text(`Bank Account: ${maskLast4(input.bankAccLast4)}`);
  doc.moveDown(1);

  doc.fontSize(11).text("Earnings & Deductions", { underline: true });
  doc.fontSize(10);
  const earnings = input.components.filter((c) => c.type === "E");
  const deductions = input.components.filter((c) => c.type === "D");
  const maxRows = Math.max(earnings.length, deductions.length);
  const colLeft = 50;
  const colRight = 300;
  for (let i = 0; i < maxRows; i++) {
    const y = doc.y;
    if (earnings[i]) doc.text(`${earnings[i].name}: ${earnings[i].amount}`, colLeft, y);
    if (deductions[i]) doc.text(`${deductions[i].name}: ${deductions[i].amount}`, colRight, y);
    doc.moveDown(0.6);
  }
  doc.moveDown(0.5);

  doc.fontSize(10).text(`Gross Earnings: ${input.grossEarnings}`);
  doc.text(`Total Deductions: ${input.totalDeductions}`);
  doc.fontSize(12).text(`Net Pay: ${input.netPay}`, { underline: true });
  doc.fontSize(9).text(`(${input.netPayInWords})`);
  doc.moveDown(2);

  doc.fontSize(8).text("Computer-generated document; signature not required.", { align: "center" });
}

export async function generatePayslipPdf(input: PayslipPdfInput, createdBy: number): Promise<PdfGenerationResult> {
  const usePassword = await passwordProtectionEnabled() && input.panEncrypted != null && input.dateOfBirth != null;
  const password = usePassword ? buildPdfPassword(decryptField(input.panEncrypted!), input.dateOfBirth!) : null;

  const doc = new PDFDocument({
    size: "A4",
    ...(password ? { userPassword: password, ownerPassword: password, permissions: { printing: "highResolution", modifying: false, copying: false } } : {}),
  });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  renderPdf(input, doc);
  doc.end();
  const pdfBuffer = await done;

  const fileGuid = randomUUID();
  const fileName = `Payslip_${input.employeeCode}_${input.periodYear}_${String(input.periodMonth).padStart(2, "0")}_v${input.versionNo}.pdf`;
  const relativeDir = path.join(String(input.periodYear), String(input.periodMonth).padStart(2, "0"), input.employeeCode);
  const relativePath = path.join(relativeDir, `${fileGuid}.pdf`);
  const absoluteDir = path.join(env.PAYSLIP_STORAGE_PATH, relativeDir);
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(env.PAYSLIP_STORAGE_PATH, relativePath), pdfBuffer);

  const sha256 = createHash("sha256").update(pdfBuffer).digest();
  const pool = await getPool();
  const fileResult = await pool
    .request()
    .input("guid", sql.UniqueIdentifier, fileGuid)
    .input("container", sql.VarChar(60), "payslips")
    .input("storageKey", sql.NVarChar(400), relativePath.split(path.sep).join("/"))
    .input("originalFileName", sql.NVarChar(260), fileName)
    .input("contentType", sql.VarChar(120), "application/pdf")
    .input("size", sql.BigInt, pdfBuffer.length)
    .input("sha256", sql.VarBinary, sha256)
    .input("uploadedBy", sql.Int, createdBy)
    .query(`INSERT INTO core.Files (FileGuid, Container, StorageKey, OriginalFileName, ContentType, SizeBytes, Sha256, ScanStatus, UploadedBy, UploadedAtUtc, IsDeleted)
            OUTPUT INSERTED.FileId
            VALUES (@guid, @container, @storageKey, @originalFileName, @contentType, @size, @sha256, 'Clean', @uploadedBy, SYSUTCDATETIME(), 0)`);
  const fileId = fileResult.recordset[0].FileId as number;

  await pool
    .request()
    .input("payslipId", sql.Int, input.payslipId)
    .input("fileId", sql.Int, fileId)
    .query(`UPDATE payroll.Payslips SET PdfFileId = @fileId, PdfGeneratedUtc = SYSUTCDATETIME(), PublishedUtc = SYSUTCDATETIME() WHERE PayslipId = @payslipId`);

  return { fileId, storageKey: relativePath.split(path.sep).join("/") };
}

export type { PayslipPdfInput };
