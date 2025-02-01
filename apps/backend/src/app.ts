import express, { Express } from "express";
import cors from "cors";
import { corsOrigin } from "./utils/general";
import { loggerMiddleware } from "./middlewares/logger.middleware";
import { prepareV1Routes } from "./apiVersions/v1";

const app: Express = express();

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: Array.isArray(corsOrigin)
      ? [...corsOrigin, process.env.FRONTEND_URL ?? "", "null"]
      : corsOrigin,
    credentials: true,
  })
);

// Logging middleware
app.use(loggerMiddleware);

// Import and prepare routes
prepareV1Routes(app);

export { app };
