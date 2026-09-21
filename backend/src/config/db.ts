import sql from "mssql";
import { env } from "./env.js";

// @types/mssql doesn't declare valueHandler even though it exists at runtime,
// so a type cast is needed. Decimal/Numeric come back as raw strings to avoid
// floating-point precision loss for money values.
const valueHandler = (
  sql as unknown as {
    valueHandler: Map<unknown, (value: unknown) => unknown>;
  }
).valueHandler;
const asString = (v: unknown) => (v == null ? v : String(v));
valueHandler.set(sql.TYPES.Decimal, asString);
valueHandler.set(sql.TYPES.Numeric, asString);

let pool: sql.ConnectionPool | undefined;
let connecting: Promise<sql.ConnectionPool> | undefined;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool) return pool;
  connecting ??= new sql.ConnectionPool({
    server: env.DB_SERVER,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    options: {
      trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
      encrypt: true,
    },
  })
    .connect()
    .then((p) => (pool = p))
    .finally(() => {
      connecting = undefined;
    });
  return connecting;
}

export { sql };
