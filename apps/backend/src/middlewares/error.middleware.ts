import { Request, Response, NextFunction } from "express";
import { logger } from "./logger.middleware";
import { ICustomError } from "../types/types.interface";

export const errorHandler = (
  err: ICustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const status: number = err.status || 500;
  const message: string = err.message || "An error occurred";

  logger.error(err);

  if (process.env.NODE_ENV === "production") {
    res.status(status).json({ message, status });
  } else {
    res.status(status).json({ message, status });
  }
};
