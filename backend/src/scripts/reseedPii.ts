// One-off remediation: the PAN/contact ciphertext already present on the 7 seeded
// hr.Employees rows (from the original database baseline, built before this app's
// encryption code existed) does not decrypt under PII_ENCRYPTION_KEY — it was
// encrypted with a different, unknown key, and that data is unrecoverable.
// DateOfBirth was also NULL for every seeded employee, which would disable PDF
// password protection entirely (Task 9 requires PAN prefix + DOB digits).
//
// Since these are synthetic test employees anyway, this regenerates plausible
// PAN/contact/DOB values and re-encrypts them under our real, current key, so
// the encrypt/decrypt/mask/audit/PDF-password pipeline can actually be exercised
// end-to-end. Safe to re-run; only touches the 7 seeded employees.
import { getPool, sql } from "../config/db.js";
import { encryptField } from "../utils/encryption.js";
import { maskPan } from "../utils/masking.js";

const PII: Record<string, { pan: string; contact: string; dob: string }> = {
  IVB036: { pan: "ABCPY1234F", contact: "+919845010001", dob: "1994-03-12" },
  "IVI-0011": { pan: "AAAPG5678K", contact: "+919845010002", dob: "1988-07-22" },
  "IVI-1003": { pan: "BBBPN4321L", contact: "+919845010003", dob: "1990-11-05" },
  "IVI-1004": { pan: "CCCPM8765M", contact: "+919845010004", dob: "1991-01-18" },
  "IVI-1005": { pan: "DDDPK2109N", contact: "+919845010005", dob: "1996-05-30" },
  "IVI-1006": { pan: "EEEPR6543O", contact: "+919845010006", dob: "1987-09-14" },
  "IVI-1007": { pan: "FFFPV0987P", contact: "+919845010007", dob: "1985-02-27" },
};

const pool = await getPool();

for (const [code, { pan, contact, dob }] of Object.entries(PII)) {
  await pool
    .request()
    .input("code", sql.NVarChar(40), code)
    .input("pan", sql.VarBinary, encryptField(pan))
    .input("panMasked", sql.NVarChar(24), maskPan(pan))
    .input("contact", sql.VarBinary, encryptField(contact))
    .input("contactLast4", sql.Char(4), contact.slice(-4))
    .input("dob", sql.Date, dob)
    .query(`UPDATE hr.Employees SET PanEncrypted = @pan, PanMasked = @panMasked,
              ContactNoEncrypted = @contact, ContactNoLast4 = @contactLast4, DateOfBirth = @dob
            WHERE EmployeeCode = @code`);
  console.log(`${code}: PAN/contact/DOB re-encrypted under the current key`);
}

process.exit(0);
