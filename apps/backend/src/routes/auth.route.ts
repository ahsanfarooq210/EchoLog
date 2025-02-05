import express, { Request, Response } from "express";
import { AuthController } from "../controllers/auth.controller";
import catchAsync from "../utils/catchAsync";

import { auth,fromNodeHeaders } from "@workspace/auth";

const router = express.Router();

// router.post("/signup", catchAsync(AuthController.signup));
// router.post("/login", catchAsync(AuthController.login));
// router.post("/generate-tokens", catchAsync(AuthController.generateAuthTokens));
// router.post("/refresh-token", catchAsync(AuthController.refreshAccessToken));
router.get("/me", async (req:any, res:any) => {
    const session = await auth.api.getSession({
     headers: fromNodeHeaders(req.headers),
   });
   return res.json(session);
});

export default router;
