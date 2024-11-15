import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Session from "supertokens-node/recipe/session";
import { authCookieNames, createHeadersFromTokens } from "@/lib/server/supertokens/cookieHelpers";
import { commonRoutes, SERVER_DATA_HEADER } from "@/lib/utils/constants";

// TODO: See how to remove duplication of `SuperTokens.init()`/`import` if possible
import "@/lib/server/supertokens/initialize"; // Side-effect

const publicPages = [
  "/",
  commonRoutes.login,
  commonRoutes.resetPassword,
  commonRoutes.emailExists,
  commonRoutes.loginPasswordless,
  commonRoutes.loginThirdParty,
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

    const requestAllowed =
      publicPages.includes(nextUrl.pathname as (typeof publicPages)[number]) ||
      (userNeedsSessionRefresh && nextUrl.pathname === commonRoutes.refreshSession);

    if (requestAllowed) {
      const globalServerData: GlobalServerData = { url: request.url };
      request.headers.set(SERVER_DATA_HEADER, JSON.stringify(globalServerData));
      return NextResponse.next({ request: { headers: request.headers } });
    }

    const basePath = userNeedsSessionRefresh ? commonRoutes.refreshSession : commonRoutes.login;
    const returnUrl = encodeURI(`${nextUrl.pathname}${nextUrl.search}`);
    const redirectUrl = `${basePath}?returnUrl=${returnUrl}`;

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
