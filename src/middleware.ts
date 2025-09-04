import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const isProtectedRoute = request.nextUrl.pathname.startsWith("/projects");
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    (request.nextUrl.pathname.startsWith("/auth") &&
      !request.nextUrl.pathname.startsWith("/auth/google/callback"));

  if (isAuthRoute && user) {
    const redirectUrl = new URL("/projects", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
