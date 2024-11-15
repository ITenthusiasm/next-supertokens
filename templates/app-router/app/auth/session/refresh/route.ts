import { parse } from "cookie";
import SuperTokensHelpers from "@/lib/server/supertokens/index";
import { authCookieNames, createHeadersFromTokens } from "@/lib/server/supertokens/cookieHelpers";
import { commonRoutes } from "@/lib/utils/constants";
import "@/lib/server/supertokens/initialize"; // Side-effect

export async function GET(request: Request) {
  const cookies = parse(request.headers.get("Cookie") ?? "");
  const refreshToken = cookies[authCookieNames.refresh] ?? "";
  const antiCsrfToken = cookies[authCookieNames.csrf];
  const newTokens = await SuperTokensHelpers.refreshToken({ refreshToken, antiCsrfToken });

  const url = new URL(request.url);
  const headers = createHeadersFromTokens(newTokens);
  headers.set("Location", newTokens.accessToken ? url.searchParams.get("returnUrl") || "/" : commonRoutes.login);
  return new Response(null, { status: newTokens.accessToken ? 307 : 303, headers });
}

export const POST = GET;
