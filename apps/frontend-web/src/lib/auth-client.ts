import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  fetchOptions: {
    onSuccess: (ctx) => {
      const authToken = ctx.response.headers.get("set-auth-token"); // get the token from the response headers
      // Store the token securely (e.g., in localStorage)
      console.log("auth bearer token", authToken);
      if (authToken) {
        localStorage.setItem("bearer_token", authToken);
      }
    },
    onError: (error) => {
      console.log("error while signing in", error);
    },
  },
  auth: {
    type: "Bearer",
    token: () => localStorage.getItem("bearer_token") || "", // get the token from localStorage
  },
});
