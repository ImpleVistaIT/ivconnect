import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { logger } from "./utils/logger.js";
import { healthRouter } from "./routes/health.js";
import { rolesRouter } from "./routes/roles.js";
import { authRouter } from "./routes/auth.js";
import { employeesRouter } from "./routes/employees.js";
import { payslipsRouter } from "./routes/payslips.js";
import { payrollRouter } from "./routes/payroll.js";
import { usersRouter } from "./routes/users.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { env } from "./config/env.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(pinoHttp({ logger }));

app.use("/api", healthRouter);

// requireAuth applies to everything under /api except health (public) and login
// (that's how you get a token in the first place). Every route below this line
// runs authenticated.
const PUBLIC_ROUTES = new Set(["POST /api/auth/login"]);
app.use("/api", (req, res, next) => {
  if (PUBLIC_ROUTES.has(`${req.method} ${req.baseUrl}${req.path}`)) {
    next();
    return;
  }
  requireAuth(req, res, next);
});

app.use("/api", authRouter);
app.use("/api", rolesRouter);
app.use("/api", employeesRouter);
app.use("/api", payslipsRouter);
app.use("/api", payrollRouter);
app.use("/api", usersRouter);

app.use(notFoundHandler);
app.use(errorHandler);
