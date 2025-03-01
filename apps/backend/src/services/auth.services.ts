import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";

dotenv.config();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateTokens = (user: { id: string }) => {
  const accessToken = jwt.sign(
    { userId: user.id },
    process.env.ACCESS_TOKEN_SECRET as string,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.REFRESH_TOKEN_SECRET as string,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

const generateInitialToken = (user: { id: string }) => {
  return jwt.sign(
    { userId: user.id },
    process.env.INITIAL_TOKEN_SECRET as string,
    { expiresIn: "5m" }
  );
};

interface GoogleTokenPayload {
  email: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export class AuthService {

}
