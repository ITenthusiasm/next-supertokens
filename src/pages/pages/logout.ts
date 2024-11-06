import type { GetServerSideProps } from "next";
import { parse } from "cookie";
import SuperTokensHelpers from "@/lib/server/supertokens";
import { authCookieNames, createCookiesFromTokens } from "@/lib/server/supertokens/cookieHelpers";
import { methodNotAllowed } from "@/lib/server/pages/responseHelpers";
import { commonRoutes } from "@/lib/utils/constants";

export { EmptyPage as default } from "@/lib/server/pages/responseHelpers";

export const getServerSideProps = (async ({ req, res }) => {
  await import("@/lib/server/supertokens/initialize"); // Server-only Side-effect
  if (req.method !== "GET") return methodNotAllowed(res, "GET");

  const cookies = parse(req.headers.cookie ?? "");
  const accessToken = cookies[authCookieNames.access] as string;
  const antiCsrfToken = cookies[authCookieNames.csrf];
  await SuperTokensHelpers.logout({ accessToken, antiCsrfToken });

  res.setHeader("Set-Cookie", createCookiesFromTokens({}));
  return { redirect: { destination: `/pages${commonRoutes.login}`, statusCode: 303 } };
}) satisfies GetServerSideProps;
