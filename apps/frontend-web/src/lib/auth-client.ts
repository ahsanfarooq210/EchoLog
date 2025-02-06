import { createAuthClient } from "@workspace/auth"
export const authClient =  createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL
})
