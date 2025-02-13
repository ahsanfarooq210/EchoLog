import { NextRequest, NextResponse } from "next/server";
import { authClient } from "./lib/auth-client";

type Session = typeof authClient.$Infer.Session;

export default async function middleware(request: NextRequest) {
  // Prevent middleware from running on auth-related paths
  if (
    request.nextUrl.pathname.startsWith("/signin") ||
    request.nextUrl.pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

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

    if (!data) {
      return NextResponse.redirect(new URL("/signin", request.nextUrl.origin));
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Authentication error:", error);
    return NextResponse.redirect(new URL("/signin", request.nextUrl.origin));
  }
}

export const config = {
  // Match all routes except api routes, static files, images, and favicon
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
