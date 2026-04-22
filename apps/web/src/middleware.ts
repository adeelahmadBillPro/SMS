import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware — cheap cookie-presence guard. Full session validation
 * happens in Server Components via `getSession()` (which round-trips to
 * the DB). The middleware only prevents unauthenticated users from even
 * reaching protected pages.
 *
 * Better-Auth session cookie name (default): "better-auth.session_token"
 */

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/admin"];
const AUTH_PAGES = ["/login", "/signup", "/reset-password"];

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  const hasSessionCookie =
    req.cookies.has("better-auth.session_token") ||
    req.cookies.has("__Secure-better-auth.session_token");

  // Kick unauthenticated users off protected routes.
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !hasSessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed-in users shouldn't linger on auth pages.
  if (AUTH_PAGES.includes(pathname) && hasSessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip _next internals, static files, and the api/auth routes themselves.
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\..*).*)",
  ],
};
