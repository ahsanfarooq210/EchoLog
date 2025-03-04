import { Application } from "express";
import authRoutes from "../routes/auth.route";
import googleMeetRoutes from '../routes/googleMeet.routes'

export const prepareV1Routes = (app: Application): void => {
  const prefix = "/api/v1/";
  app.use(`${prefix}auth`, authRoutes);
  app.use(`${prefix}meet`, googleMeetRoutes)
};
