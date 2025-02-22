import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@workspace/db";

export const auth = betterAuth({
  trustedOrigins: [
    "http://localhost:3000",
    "chrome-extension://ldcpielebmbljegghchppiohjljmkdbc",
    "https://ldcpielebmbljegghchppiohjljmkdbc.chromiumapp.org/oauth2",
    "https://ldcpielebmbljegghchppiohjljmkdbc.chromiumapp.org/",
  ],
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "postgresql", ...etc
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      accessType: "offline",
      prompt: "consent",
    },
  },
});
