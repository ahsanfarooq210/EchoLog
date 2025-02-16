import express, { Request, Response } from "express";
import { AuthController } from "../controllers/auth.controller";
import catchAsync from "../utils/catchAsync";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../utils/auth";

const router = express.Router();

// router.post("/signup", catchAsync(AuthController.signup));
// router.post("/login", catchAsync(AuthController.login));
// router.post("/generate-tokens", catchAsync(AuthController.generateAuthTokens));
// router.post("/refresh-token", catchAsync(AuthController.refreshAccessToken));
router.get("/me", async (req: any, res: any) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  // const accounts = await auth.api.listUserAccounts()
  // console.log("backend session",accounts)
  return res.json(session);
});

export default router;
