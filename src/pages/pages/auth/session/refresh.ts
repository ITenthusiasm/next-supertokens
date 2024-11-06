import type { GetServerSideProps } from "next";
import { parse } from "cookie";
import SuperTokensHelpers from "@/lib/server/supertokens/index";
import { authCookieNames, createCookiesFromTokens } from "@/lib/server/supertokens/cookieHelpers";
import { methodNotAllowed, redirect } from "@/lib/server/pages/responseHelpers";
import { commonRoutes } from "@/lib/utils/constants";

export { EmptyPage as default } from "@/lib/server/pages/responseHelpers";

export const getServerSideProps = (async ({ req, query, res }) => {
  await import("@/lib/server/supertokens/initialize"); // Server-only Side-effect
  if (req.method !== "GET" && req.method !== "POST") return methodNotAllowed(res, "GET, POST");

  const cookies = parse(req.headers.cookie ?? "");
  const refreshToken = cookies[authCookieNames.refresh] ?? "";
  const antiCsrfToken = cookies[authCookieNames.csrf];

  const newTokens = await SuperTokensHelpers.refreshToken({ refreshToken, antiCsrfToken });
  res.setHeader("Set-Cookie", createCookiesFromTokens(newTokens));

  if (!newTokens.accessToken) return redirect(req, res, `/pages${commonRoutes.login}`, 303);
  return redirect(req, res, query.returnUrl?.toString() || "/pages", 307);
}) satisfies GetServerSideProps;
