import express, { Request, Response } from "express";
import { AuthController } from "../controllers/auth.controller";
import catchAsync from "../utils/catchAsync";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../utils/auth";
import { authenticateionMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

// router.post("/signup", catchAsync(AuthController.signup));
// router.post("/login", catchAsync(AuthController.login));
// router.post("/generate-tokens", catchAsync(AuthController.generateAuthTokens));
// router.post("/refresh-token", catchAsync(AuthController.refreshAccessToken));
router.get(
  "/me",
  authenticateionMiddleware,
  async (req: Request, res: Response) => {
    // const session = await auth.api.getSession({
    //   headers: fromNodeHeaders(req.headers),
    // });
    // // const accounts = await auth.api.listUserAccounts()
    // // console.log("backend session",accounts)
    res.json(req.user);
    return;
  }
);

export default router;
