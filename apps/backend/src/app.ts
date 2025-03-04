import express, { Express } from "express";
import cors from "cors";
import { corsOrigin } from "./utils/general";
import { loggerMiddleware } from "./middlewares/logger.middleware";
import { prepareV1Routes } from "./apiVersions/v1";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./utils/auth";

const app: Express = express();

type SessionUserType = typeof auth.$Infer.Session;

// Extend Express Request to include the user
declare global {
  namespace Express {
    interface User extends SessionUserType { } // This makes req.user match your JWT payload
    interface Request {
      user?: User;
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
app.use(loggerMiddleware);

app.all("/api/auth/*", toNodeHandler(auth));
// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware

// Import and prepare routes
prepareV1Routes(app);


export { app };
