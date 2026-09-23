# Phase 1 test accounts

**These are test-only credentials. Do not run this seed against a real or
production database. Every account below uses the same publicly-known
password and exists purely so a human (or the integration test suite) can
log in and exercise each role.**

Seeding is implemented as a TypeScript script, `backend/src/scripts/seed.ts`
(run with `npm run seed` from `backend/`), not a raw `.sql` file — see the
comment at the top of that file for why. It is safe to re-run: role
assignments are idempotent, and passwords are reset to the value below every
time it runs.

Password for **all** accounts: `Test@1234`

| Employee | Employee code | Email | Role(s) |
|---|---|---|---|
| Naga Yashas | IVB036 | naga.yashas@implevistait.com | EMPLOYEE |
| RamaKrishna Gangula | IVI-0011 | ramakrishna.gangula@implevistait.com | EMPLOYEE + MANAGER |
| Priya Nair | IVI-1003 | priya.nair@implevistait.com | EMPLOYEE + HR_ADMIN |
| Arjun Mehta | IVI-1004 | arjun.mehta@implevistait.com | EMPLOYEE + PAYROLL_ADMIN |
| Sneha Kulkarni | IVI-1005 | sneha.kulkarni@implevistait.com | EMPLOYEE + SALES_REP |
| Vikram Rao | IVI-1006 | vikram.rao@implevistait.com | EMPLOYEE + SALES_MANAGER |
| Deepak Verma | IVI-1007 | deepak.verma@implevistait.com | EMPLOYEE + SYS_ADMIN |

Naga Yashas (IVB036) reports to RamaKrishna Gangula (IVI-0011) — this is the
manager relationship the manager-scoped access tests exercise.
