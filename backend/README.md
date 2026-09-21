# IV Connect Backend

Express + TypeScript API backed by SQL Server.

## Run locally

```bash
cp .env.example .env   # then set DB_PASSWORD to your ivconnect-sql container's password
npm install
npm run dev
```

## Endpoints

- `GET /api/health` - runs `SELECT 1` against the database; returns `{ "status": "ok", "database": "connected" }`.
- `GET /api/roles` - returns `RoleCode` and `RoleName` from `core.Roles`, ordered by `RoleId`.

## Moving to another database server

Only `.env` values change (`DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, ...). No code changes needed.

## Scripts

`npm run dev` (tsx watch), `npm run build` (tsc), `npm start` (run compiled output).
