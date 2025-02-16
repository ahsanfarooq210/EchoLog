import { Request, Response, NextFunction } from "express";
import { auth } from "../utils/auth";
import { fromNodeHeaders } from "better-auth/node";

export const authenticateionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    req.user = session;
  } catch (error) {}
};
