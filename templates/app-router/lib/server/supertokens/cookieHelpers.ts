import type { SessionContainerInterface } from "supertokens-node/lib/build/recipe/session/types";
import type Passwordless from "supertokens-node/recipe/passwordless";
import { serialize } from "cookie";
import type { SerializeOptions } from "cookie";
import { commonRoutes } from "@/lib/utils/constants";

type CookieSettings = Omit<SerializeOptions, "encode"> & { path: string };

export type Tokens = Pick<
  ReturnType<SessionContainerInterface["getAllSessionTokensDangerously"]>,
  "accessToken" | "refreshToken" | "antiCsrfToken"
>;

export type CodeDetails = Pick<
  Awaited<ReturnType<Passwordless.RecipeInterface["createCode"]>>,
  "deviceId" | "preAuthSessionId"
>;

/** The `name`s of the `SuperTokens` auth cookies used throughout the application */
export const authCookieNames = Object.freeze({ access: "sAccessToken", refresh: "sRefreshToken", csrf: "sAntiCsrf" });
const oneYearInMilliseconds = 365 * 24 * 60 * 60 * 1000;

/** The `name`s of the cookies used to store `SuperTokens`'s Passwordless data for a given device */
export const deviceCookieNames = Object.freeze({ deviceId: "sDeviceId", preAuthSessionId: "sPreAuthSessionId" });

const commonCookieSettings = Object.freeze({
  httpOnly: true,
  secure: process.env.SUPERTOKENS_WEBSITE_DOMAIN?.startsWith("https"),
  sameSite: "strict",
  priority: "high",
} as const satisfies Omit<CookieSettings, "path">);

/**
 * Generates the [settings](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#attributes)
 * for a _new_ `SuperTokens` HTTP Cookie
 *
 * @param type The type of cookie for which the settings are being generated
 */
export function createCookieSettings(type?: keyof typeof authCookieNames | "device" | "pkce"): CookieSettings {
  const nextYear = new Date(new Date().getTime() + oneYearInMilliseconds);

  let path = "/";
  if (type === "refresh") path = commonRoutes.refreshSession;
  else if (type === "device") path = commonRoutes.loginPasswordless;
  else if (type === "pkce") path = commonRoutes.loginThirdParty;

  /*
   * Note: SuperTokens is responsible for enforcing the expiration dates, not the browser. Just make sure
   * that the cookie lives long enough in the browser for SuperTokens to be able to receive it and validate it.
   */
  return { expires: nextYear, path, ...commonCookieSettings };
}

export const deleteCookieSettings = Object.freeze({ expires: new Date(0), path: "/" }) satisfies CookieSettings;
const deleteRefreshSettings = Object.freeze({ ...deleteCookieSettings, path: commonRoutes.refreshSession });

/**
 * Generates the HTTP Headers needed to store the `SuperTokens` auth tokens in the user's browser as cookies.
 * An empty token in `tokens` indicates that its corresponding cookie should be removed from the browser.
 * For example, if `tokens` is an empty object, then _all_ SuperTokens auth cookies will be deleted from the browser.
 *
 * @example
 * const headers = createHeadersFromTokens({});
 * headers.set("Location", "/login");
 * const response = new Response(null, { headers, status: 303 });
 */
export function createHeadersFromTokens(tokens: Partial<Tokens>): Headers {
  const headers = new Headers();
  const headerName = "Set-Cookie";
  const { accessToken, refreshToken, antiCsrfToken } = tokens;

  if (!accessToken) headers.append(headerName, serialize(authCookieNames.access, "", deleteCookieSettings));
  else headers.append(headerName, serialize(authCookieNames.access, accessToken, createCookieSettings()));

  if (!refreshToken) headers.append(headerName, serialize(authCookieNames.refresh, "", deleteRefreshSettings));
  else headers.append(headerName, serialize(authCookieNames.refresh, refreshToken, createCookieSettings("refresh")));

  if (!antiCsrfToken) headers.append(headerName, serialize(authCookieNames.csrf, "", deleteCookieSettings));
  else headers.append(headerName, serialize(authCookieNames.csrf, antiCsrfToken, createCookieSettings()));

  return headers;
}