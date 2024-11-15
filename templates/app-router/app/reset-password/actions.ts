"use server";

import { redirect, RedirectType } from "next/navigation";
import SuperTokensHelpers from "@/lib/server/supertokens";
import { getGlobalServerData } from "@/lib/server/requestHelpers";
import { validateEmail, validatePassword } from "@/lib/utils/validation";
import { commonRoutes } from "@/lib/utils/constants";
import "@/lib/server/supertokens/initialize"; // Side-effect

type SendEmailActionData = { email?: string | null };
export async function sendEmail(_previousState: SendEmailActionData, formData: FormData): Promise<SendEmailActionData> {
  const { user } = await getGlobalServerData();
  if (user) throw redirect("/", RedirectType.replace);

  // Validation
  const { email } = Object.fromEntries(formData) as Record<string, string>;
  if (!email) return { email: "Email is required" };
  else if (!validateEmail(email)) return { email: "Email is invalid" };

  // Email a "reset password" link (or fail silently for invalid users/emails)
  await SuperTokensHelpers.sendPasswordResetEmail(email);
  throw redirect(`${commonRoutes.resetPassword}?mode=emailed`, RedirectType.push);
}

type ResetPasswordActionData = { [key in "banner" | "password" | "confirm-password"]?: string | null };
export async function resetPassword(
  _previousState: ResetPasswordActionData,
  formData: FormData,
): Promise<ResetPasswordActionData> {
  const { user } = await getGlobalServerData();
  if (user) throw redirect("/", RedirectType.replace);

  // Validate Fields
  const formDataAsObject = Object.fromEntries(formData) as Record<string, string>;
  const { password, "confirm-password": confirmPassword, token = "" } = formDataAsObject;

  const errors: ResetPasswordActionData = {};
  if (!password) errors.password = "New password is required";
  else if (!validatePassword(password)) {
    errors.password = "Password must contain at least 8 characters, including a number";
  }

  if (!confirmPassword) errors["confirm-password"] = "Confirm password is required";
  else if (password !== confirmPassword) errors["confirm-password"] = "Confirmation password doesn't match";

  if (errors.password || errors["confirm-password"]) return errors;

  // Validate Token
  if (!token) return { banner: "Invalid password reset link" };

  const status = await SuperTokensHelpers.resetPassword(token, password);
  if (status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") return { banner: "Invalid password reset link" };

  // Password reset succeeded
  throw redirect(`${commonRoutes.resetPassword}?mode=success`, RedirectType.push);
}
