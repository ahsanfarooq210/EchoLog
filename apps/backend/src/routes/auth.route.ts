import express from "express";
import { AuthController } from "../controllers/auth.controller";
import catchAsync from "../utils/catchAsync";

const router = express.Router();

// router.post("/signup", catchAsync(AuthController.signup));
// router.post("/login", catchAsync(AuthController.login));
// router.post("/generate-tokens", catchAsync(AuthController.generateAuthTokens));
// router.post("/refresh-token", catchAsync(AuthController.refreshAccessToken));

export default router;
