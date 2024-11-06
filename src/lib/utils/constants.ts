/** Commonly referenced routes throughout the app */
export const commonRoutes = {
  login: "/login",
  resetPassword: "/reset-password",
  refreshSession: "/auth/session/refresh",
  emailExists: "/api/email-exists",
  loginPasswordless: "/passwordless/login",
  loginThirdParty: "/thirdparty/login",
} as const;

/** Page routes related to authentication. */
export const authPages: string[] = [
  commonRoutes.login,
  commonRoutes.resetPassword,
  commonRoutes.refreshSession,
  commonRoutes.emailExists,
  commonRoutes.loginPasswordless,
  commonRoutes.loginThirdParty,
];

/** Header used for passing global data between the Next.js App Router server functions */
export const SERVER_DATA_HEADER = "X-GLOBAL-SERVER-DATA";

/**
 * Indicates that a client-side request was made using JavaScript. This header is used strictly to determine
 * how redirects should be handled on the server.
 *
 * (`pages` dir only)
 */
export const JS_REQUEST_HEADER = "X-REQUEST-WITH-JS";

/**
 * Indicates where a client-side {@link fetch} request should be _manually_ redirected.
 *
 * (`pages` dir only)
 */
export const REDIRECT_LOCATION_HEADER = "X-Redirect-Location";

/**
 * Indicates the _true_ response status code for a client-side {@link fetch} request
 * that should be _manually_ redirected.
 *
 * (`pages` dir only)
 */
export const REDIRECT_STATUS_HEADER = "X-Redirect-Status";
