// Usage: npm run set-password -- <username> <new-password>
// Sets a bcrypt password hash, rotates the security stamp and clears lockout for one user.
import { getPool, sql } from "../config/db.js";
import { hashPassword } from "../utils/password.js";

const [username, password] = process.argv.slice(2);
if (!username || !password || password.length < 8) {
  console.error("Usage: npm run set-password -- <username> <password (min 8 chars)>");
  process.exit(1);
}

const pool = await getPool();
const result = await pool
  .request()
  .input("name", sql.NVarChar(200), username.toUpperCase())
  .input("hash", sql.NVarChar(1000), await hashPassword(password))
  .query(`UPDATE core.Users SET PasswordHash = @hash, SecurityStamp = NEWID(), FailedLoginCount = 0,
            LockoutEndUtc = NULL, MustChangePassword = 0, LastPasswordChgUtc = SYSUTCDATETIME()
          WHERE NormalizedUserName = @name`);
console.log(result.rowsAffected[0] ? `Password updated for ${username}` : `No user named ${username}`);
process.exit(0);
