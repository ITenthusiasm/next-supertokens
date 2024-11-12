import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Session from "supertokens-node/recipe/session";
import { authCookieNames, createHeadersFromTokens } from "@/lib/server/supertokens/cookieHelpers";
import {
  commonRoutes,
  SERVER_DATA_HEADER,
  JS_REQUEST_HEADER,
  REDIRECT_LOCATION_HEADER,
  REDIRECT_STATUS_HEADER,
} from "@/lib/utils/constants";

// TODO: See how to remove duplication of `SuperTokens.init()`/`import` if possible
import "@/lib/server/supertokens/initialize"; // Side-effect

const publicPages = [
  // `App` Dir Public Routes
  "/",
  commonRoutes.login,
  commonRoutes.resetPassword,
  commonRoutes.emailExists,
  commonRoutes.loginPasswordless,
  commonRoutes.loginThirdParty,

  // `Pages` Dir Public Routes
  "/pages",
  `/pages${commonRoutes.login}`,
  `/pages${commonRoutes.resetPassword}`,
  `/pages${commonRoutes.emailExists}`,
  `/pages${commonRoutes.loginPasswordless}`,
  `/pages${commonRoutes.loginThirdParty}`,
] as const;

export async function middleware(request: NextRequest) {
  try {
    const accessToken = request.cookies.get(authCookieNames.access)?.value ?? "";
    const antiCsrfToken = request.cookies.get(authCookieNames.csrf)?.value;
    const session = await Session.getSessionWithoutRequestResponse(accessToken, antiCsrfToken);
    const userId = session.getUserId();

    const globalServerData: GlobalServerData = { user: { id: userId }, url: request.url };
    request.headers.set(SERVER_DATA_HEADER, JSON.stringify(globalServerData));
    return NextResponse.next({ request: { headers: request.headers } });
  } catch (error) {
    if (!Session.Error.isErrorFromSuperTokens(error)) {
      return new Response("An unexpected error occurred", { status: 500 });
    }

    const userNeedsSessionRefresh = error.type === Session.Error.TRY_REFRESH_TOKEN;
    const { nextUrl } = request;

    const refreshPath =
      `${nextUrl.pathname.startsWith("/pages") ? "/pages" : ""}${commonRoutes.refreshSession}` as const;

    const requestAllowed =
      publicPages.includes(nextUrl.pathname as (typeof publicPages)[number]) ||
      (userNeedsSessionRefresh && nextUrl.pathname === refreshPath);

    if (requestAllowed) {
      const globalServerData: GlobalServerData = { url: request.url };
      request.headers.set(SERVER_DATA_HEADER, JSON.stringify(globalServerData));
      return NextResponse.next({ request: { headers: request.headers } });
    }

    const basePath = userNeedsSessionRefresh ? refreshPath : commonRoutes.login;
    const returnUrl = encodeURI(`${nextUrl.pathname}${nextUrl.search}`);
    const redirectUrl = `${basePath}?returnUrl=${returnUrl}`;

    // Redirect the user to the proper auth page. Delete their tokens if they don't need to attempt a token refresh.
    if (request.headers.has(JS_REQUEST_HEADER)) {
      const headers = userNeedsSessionRefresh ? new Headers() : createHeadersFromTokens({});
      headers.set(REDIRECT_LOCATION_HEADER, redirectUrl);
      headers.set(REDIRECT_STATUS_HEADER, String(userNeedsSessionRefresh ? 307 : 303));

      return new Response(null, { status: 204, headers });
    }

    return NextResponse.redirect(new URL(redirectUrl, request.url), {
      status: userNeedsSessionRefresh ? 307 : 303,
      headers: userNeedsSessionRefresh ? undefined : createHeadersFromTokens({}),
    });
  }
}

// See: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
