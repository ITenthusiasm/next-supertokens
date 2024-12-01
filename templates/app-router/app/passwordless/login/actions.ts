"use server";

import { redirect, RedirectType } from "next/navigation";
import { cookies } from "next/headers";
import SuperTokensHelpers from "@/lib/server/supertokens";
import type { PasswordlessFlow } from "@/lib/server/supertokens";
import {
  authCookieNames,
  deviceCookieNames,
  createCookieSettings,
  deleteCookieSettings,
} from "@/lib/server/supertokens/cookieHelpers";
import { validateEmail, validatePhone } from "@/lib/utils/validation";
import { commonRoutes } from "@/lib/utils/constants";
import { getGlobalServerData } from "@/lib/server/requestHelpers";
import "@/lib/server/supertokens/initialize"; // Side-effect

type RequestCodeActionData = { [key in "banner" | "email" | "phoneNumber"]?: string | null };
export async function requestCode(
  _previousState: RequestCodeActionData,
  formData: FormData,
): Promise<RequestCodeActionData> {
  const { user, url } = await getGlobalServerData();
  if (user) throw redirect("/", RedirectType.replace);

  // Note: Type casting is just for convenience. We expect EITHER `email` OR `phoneNumber` to be provided. Not both.
  const { email, phoneNumber } = Object.fromEntries(formData) as Record<string, string>;

  // Only troublesome users will get here.
  if (email == null && phoneNumber == null) {
    return { banner: "Please provide an email or a phone number" };
  }

  // Only troublesome users will get here too.
  if (email != null && phoneNumber != null) {
    return { banner: "You may provide an email or a phone number, but not both" };
  }

  if (email != null) {
    if (!email) return { email: "Email is required" };
    if (!validateEmail(email)) return { email: "Email is invalid" };
  }

  if (phoneNumber != null) {
    if (!phoneNumber) return { phoneNumber: "Phone Number is required" };
    if (!validatePhone(phoneNumber)) return { phoneNumber: "Phone Number is invalid" };
  }

  // Send a code/link
  const flow: PasswordlessFlow = "both" as PasswordlessFlow; // Note: You can change this depending on your needs.
  const code = await SuperTokensHelpers.sendPasswordlessInvite({ email, phoneNumber, flow });

  // Redirect to relevant page (with Device Details), preserving `returnUrl` if it previously existed
  const cookieSettings = createCookieSettings("device");
  const cookiesMap = await cookies();
  cookiesMap.set(deviceCookieNames.deviceId, code.deviceId, cookieSettings);
  cookiesMap.set(deviceCookieNames.preAuthSessionId, code.preAuthSessionId, cookieSettings);

  const urlObject = new URL(url);
  urlObject.searchParams.set("mode", flow === "link" ? "messaged" : "code-signin");
  if (flow === "link") urlObject.searchParams.delete("returnUrl"); // `returnUrl` is no longer relevant in this case

  throw redirect(`${urlObject.pathname}${urlObject.search}`, RedirectType.push);
}

type LoginActionData = { [key in "banner" | "code"]?: string | null };
export async function login(_previousState: LoginActionData, formData: FormData): Promise<LoginActionData> {
  const { user } = await getGlobalServerData();
  if (user) throw redirect("/", RedirectType.replace);

  const code = formData.get("code")?.toString();
  return code ? attemptSigninWith(code) : { code: "Code is required" };
}

// TODO: SuperTokens seems to `THROW` an error when there's a bad `preAuthSessionId`. This issue has been
// reported to the SuperTokens team and is unexpected behavior. We'll need to wait for them to supply a fix.
const deleteDeviceCookieSettings = { ...deleteCookieSettings, path: commonRoutes.loginPasswordless };
export async function attemptSigninWith(code: string, link?: boolean): Promise<LoginActionData> {
  // Get Credentials
  const cookiesMap = await cookies();
  const deviceId = cookiesMap.get(deviceCookieNames.deviceId)?.value ?? "";
  const preAuthSessionId = cookiesMap.get(deviceCookieNames.preAuthSessionId)?.value ?? "";

  // Validate Code
  const credentials = link ? { linkCode: code, preAuthSessionId } : { userInputCode: code, deviceId, preAuthSessionId };
  const { status, tokens } = await SuperTokensHelpers.passwordlessSignin(credentials);

  // Auth Failed
  if (status === "RESTART_FLOW_ERROR") return { banner: "Please request a new code" };
  if (status === "EXPIRED_USER_INPUT_CODE_ERROR") return { code: "This code has expired" };
  if (status === "LINKING_TO_SESSION_USER_FAILED") return { banner: "Account linking failed" };
  if (status !== "OK") return { code: "Code is invalid " };

  // Auth succeeded. Set auth tokens and clear device data.
  const cookieSettings = createCookieSettings();
  const refreshCookieSettings = createCookieSettings("refresh");

  cookiesMap.set(authCookieNames.access, tokens.accessToken, cookieSettings);
  cookiesMap.set(authCookieNames.refresh, tokens.refreshToken as string, refreshCookieSettings);
  if (tokens.antiCsrfToken) cookiesMap.set(authCookieNames.csrf, tokens.antiCsrfToken, cookieSettings);

  cookiesMap.delete({ name: deviceCookieNames.deviceId, ...deleteDeviceCookieSettings });
  cookiesMap.delete({ name: deviceCookieNames.preAuthSessionId, ...deleteDeviceCookieSettings });

  const url = new URL((await getGlobalServerData()).url);
  throw redirect(url.searchParams.get("returnUrl") || "/", RedirectType.push);
}
