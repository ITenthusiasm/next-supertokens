import type { GetServerSideProps } from "next";
import { parse } from "cookie";
import SuperTokensHelpers from "@/lib/server/supertokens";
import { authCookieNames, createCookiesFromTokens } from "@/lib/server/supertokens/cookieHelpers";
import { methodNotAllowed, redirect } from "@/lib/server/responseHelpers";
import { commonRoutes } from "@/lib/utils/constants";

export { EmptyPage as default } from "@/lib/server/responseHelpers";

export const getServerSideProps = (async ({ req, query, res }) => {
  await import("@/lib/server/supertokens/initialize"); // Server-only Side-effect
  if (req.method !== "GET" && req.method !== "POST") return methodNotAllowed(res, "GET, POST");

  const cookies = parse(req.headers.cookie ?? "");
  const refreshToken = cookies[authCookieNames.refresh] ?? "";
  const antiCsrfToken = cookies[authCookieNames.csrf];

  const newTokens = await SuperTokensHelpers.refreshToken({ refreshToken, antiCsrfToken });
  res.setHeader("Set-Cookie", createCookiesFromTokens(newTokens));

  if (!newTokens.accessToken) return redirect(req, res, commonRoutes.login, 303);
  return redirect(req, res, query.returnUrl?.toString() || "/", 307);
}) satisfies GetServerSideProps;
