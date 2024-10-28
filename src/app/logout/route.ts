import { parse } from "cookie";
import SuperTokensHelpers from "@/lib/server/supertokens/index";
import { authCookieNames, createHeadersFromTokens } from "@/lib/server/supertokens/cookieHelpers";
import { commonRoutes } from "@/lib/utils/constants";
import "@/lib/server/supertokens/initialize"; // Side-effect

export async function GET(request: Request): Promise<Response> {
  const cookies = parse(request.headers.get("Cookie") ?? "");
  const accessToken = cookies[authCookieNames.access] as string;
  const antiCsrfToken = cookies[authCookieNames.csrf];
  await SuperTokensHelpers.logout({ accessToken, antiCsrfToken });

  const headers = createHeadersFromTokens({});
  headers.set("Location", commonRoutes.login);
  return new Response(null, { status: 303, statusText: "OK", headers });
}
