import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DB_SERVER: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(1433),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_TRUST_SERVER_CERTIFICATE: z
    .string()
    .default("true")
    .transform((v) => v.toLowerCase() === "true"),
  // Signs and verifies login JWTs. Generate a real value with:
  // node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  JWT_SECRET: z.string().min(32),
  // How long an issued token stays valid, e.g. "8h", "15m".
  JWT_EXPIRES_IN: z.string().min(1).default("8h"),
  // AES-256-GCM key (32 bytes as 64 hex chars) for PAN/contact/address encryption.
  // Generate a real value with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  PII_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, "must be 64 hex chars (32 bytes)"),
  CORS_ORIGIN: z.string().default("http://localhost:8080"),
  // Local folder generated payslip PDFs are written to. A cloud blob store is the
  // real production target; local disk is correct and sufficient for this phase.
  PAYSLIP_STORAGE_PATH: z.string().default("./generated-payslips"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
