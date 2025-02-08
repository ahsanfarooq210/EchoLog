import express, { Express } from "express";
import cors from "cors";
import { corsOrigin } from "./utils/general";
import { loggerMiddleware } from "./middlewares/logger.middleware";
import { prepareV1Routes } from "./apiVersions/v1";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./utils/auth";

const app: Express = express();

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
app.use(
  cors({
    origin: Array.isArray(corsOrigin)
      ? [...corsOrigin, process.env.FRONTEND_URL ?? "", "null", "*"]
      : corsOrigin,
    credentials: true,
  })
);

app.all("/api/auth/*", toNodeHandler(auth));
// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(loggerMiddleware);

// Import and prepare routes
prepareV1Routes(app);

export { app };
