import { Application } from "express";
import authRoutes from "../routes/auth.route";
import puppetterRoutes from '../routes/puppeteer.routes'

export const prepareV1Routes = (app: Application): void => {
  const prefix = "/api/v1/";
  app.use(`${prefix}auth`, authRoutes);
  app.use(`${prefix}meet`, puppetterRoutes)
};
