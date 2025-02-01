import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@workspace/db";

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
  static async signup(
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ) {
    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return { status: 400, data: { message: "User already exists" } };
      }

      const hashedPassword = await bcrypt.hash(
        password,
        process.env.BCRYPT_SALT_ROUNDS ?? 10
      );
      await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
        },
      });

      return { status: 201, data: { message: "User created successfully" } };
    } catch (error) {
      return { status: 500, data: { message: "Internal server error" } };
    }
  }

  static async login(email: string, password: string) {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return { status: 401, data: { message: "Invalid credentials" } };
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return { status: 401, data: { message: "Invalid credentials" } };
      }

      const initialToken = generateInitialToken(user);

      return {
        status: 200,
        data: {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            imageUrl: user.imageUrl,
          },
          token: initialToken,
        },
      };
    } catch (error) {
      return { status: 500, data: { message: "Internal server error" } };
    }
  }

  static async verifyGoogleToken(token: string): Promise<GoogleTokenPayload> {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error("Invalid Google token");
      }
      return {
        email: payload.email!,
        given_name: payload.given_name,
        family_name: payload.family_name,
        picture: payload.picture,
      };
    } catch (error) {
      throw new Error("Failed to verify Google token");
    }
  }

  static async generateAuthTokens(
    token: string,
    tokenType: "initial" | "google" = "initial"
  ) {
    try {
      let user;

      if (tokenType === "initial") {
        // Handle initial token flow
        if (!token) {
          return { status: 401, data: { message: "Token required" } };
        }

        const decoded = jwt.verify(
          token,
          process.env.INITIAL_TOKEN_SECRET as string
        ) as { userId: string };

        user = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user) {
          return { status: 403, data: { message: "Invalid token" } };
        }
      } else {
        // Handle Google token flow
        try {
          const googleUserData = await this.verifyGoogleToken(token);

          // Find or create user based on Google email
          user = await prisma.user.findUnique({
            where: { email: googleUserData.email },
          });

          if (!user) {
            // Create new user with Google data
            user = await prisma.user.create({
              data: {
                email: googleUserData.email,
                firstName: googleUserData.given_name || "",
                lastName: googleUserData.family_name || "",
                imageUrl: googleUserData.picture,
                password: await bcrypt.hash(Math.random().toString(36), 10), // Random password for Google users
              },
            });
          }
        } catch (error) {
          return { status: 401, data: { message: "Invalid Google token" } };
        }
      }

      const { accessToken, refreshToken } = generateTokens(user);

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: await bcrypt.hash(refreshToken, 10) },
      });

      return {
        status: 200,
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            imageUrl: user.imageUrl,
          },
        },
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return { status: 403, data: { message: "Invalid token" } };
      }
      return { status: 500, data: { message: "Internal server error" } };
    }
  }

  static async refreshAccessToken(refreshToken: string) {
    try {
      if (!refreshToken) {
        return { status: 401, data: { message: "Refresh token required" } };
      }

      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET as string
      ) as { userId: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (
        !user ||
        !user.refreshToken ||
        !bcrypt.compare(refreshToken, user.refreshToken)
      ) {
        return { status: 403, data: { message: "Invalid refresh token" } };
      }

      const { accessToken, refreshToken: newRefreshToken } =
        generateTokens(user);

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: await bcrypt.hash(newRefreshToken, 10) },
      });

      return {
        status: 200,
        data: { accessToken, refreshToken: newRefreshToken },
      };
    } catch (error) {
      return { status: 500, data: { message: "Internal server error" } };
    }
  }
}
