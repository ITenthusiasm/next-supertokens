"use server";

import { redirect, RedirectType } from "next/navigation";
import { cookies } from "next/headers";
import SuperTokensHelpers from "@/lib/server/supertokens";
import { authCookieNames, createCookieSettings } from "@/lib/server/supertokens/cookieHelpers";
import { validateEmail, validatePassword } from "@/lib/utils/validation";
import { getGlobalServerData } from "@/lib/server/app/requestHelpers";
import "@/lib/server/supertokens/initialize"; // Side-effect

type LoginActionData = { [key in "banner" | "email" | "password"]?: string | null };

export async function loginAction(_previousState: LoginActionData, formData: FormData): Promise<LoginActionData> {
  const { user, url } = await getGlobalServerData();
  if (user) throw redirect("/", RedirectType.replace);

  // Form Data
  const { email, password, mode } = Object.fromEntries(formData) as Record<string, string>;

  // Validate Data
  const errors: LoginActionData = {};
  if (!email) errors.email = "Email is required";
  else if (!validateEmail(email)) errors.email = "Email is invalid";

  if (!password) errors.password = "Password is required";
  else if (mode === "signup" && !validatePassword(password)) {
    errors.password = "Password must contain at least 8 characters, including a number";
  }

  // TODO: It seems like Next.js can't return status codes for server actions yet...
  // See: https://github.com/vercel/next.js/discussions/49302
  if (errors.email || errors.password) return errors;

  // Attempt Sign In / Sign Up
  const normalizedMode = mode === "signup" ? "signup" : "signin";
  const { status, tokens } = await SuperTokensHelpers[normalizedMode](email, password);

  // Auth failed
  if (status === "WRONG_CREDENTIALS_ERROR") return { banner: "Incorrect email and password combination" };
  if (status === "EMAIL_ALREADY_EXISTS_ERROR") return { email: "This email already exists. Please sign in instead." };

  // Auth succeeded
  const cookieSettings = createCookieSettings();
  const refreshCookieSettings = createCookieSettings("refresh");

  const cookiesMap = await cookies();
  cookiesMap.set(authCookieNames.access, tokens.accessToken, cookieSettings);
  cookiesMap.set(authCookieNames.refresh, tokens.refreshToken as string, refreshCookieSettings);
  if (tokens.antiCsrfToken) cookiesMap.set(authCookieNames.csrf, tokens.antiCsrfToken, cookieSettings);

  throw redirect(new URL(url).searchParams.get("returnUrl") || "/", RedirectType.push);
}
