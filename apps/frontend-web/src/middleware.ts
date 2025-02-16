import { NextRequest, NextResponse } from "next/server";
import { authClient } from "./lib/auth-client";

type Session = typeof authClient.$Infer.Session;

export default async function middleware(request: NextRequest) {
  // Prevent middleware from running on auth-related paths
  if (
    // request.nextUrl.pathname.startsWith("/signin") ||
    request.nextUrl.pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  const isSigninPage = request.nextUrl.pathname.includes("/signin");
  const isDashboardPage = request.nextUrl.pathname.includes("/dashboard");

  try {
    const url = new URL("/api/auth/get-session", request.nextUrl.origin);

    const response = await fetch(url, {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });

    if (response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as Session;
    console.log("middleware session", data);

    const isAuthenticated = Object.keys(data).length > 0;

    if (!isAuthenticated && isDashboardPage) {
      return NextResponse.redirect(new URL("/signin", request.nextUrl.origin));
    }

    if (isAuthenticated && isSigninPage) {
      return NextResponse.redirect(
        new URL("/dashboard", request.nextUrl.origin)
      );
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Authentication error:", error);

    if (!isSigninPage) {
      return NextResponse.redirect(new URL("/signin", request.nextUrl.origin));
    }
  }
}

export const config = {
  // Match all routes except api routes, static files, images, and favicon
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
