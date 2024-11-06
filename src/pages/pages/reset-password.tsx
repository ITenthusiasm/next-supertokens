import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import type { ParsedUrlQuery } from "node:querystring";
import { useState, useEffect, useMemo, useCallback } from "react";
import { createFormValidityObserver } from "@form-observer/react";
import type { ValidatableField } from "@form-observer/react";
import { useFormAction } from "@/lib/utils/pages/hooks";
import SuperTokensHelpers from "@/lib/server/supertokens";
import { getGlobalServerData, getFormData } from "@/lib/server/pages/requestHelpers";
import { redirect, methodNotAllowed } from "@/lib/server/pages/responseHelpers";
import { validateEmail, validatePassword } from "@/lib/utils/validation";
import { commonRoutes } from "@/lib/utils/constants";

/* -------------------- Browser -------------------- */
export default function ResetPassword({ loader, action }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { mode, token } = loader;
  const [serverErrors, submit] = useFormAction(action);
  const [errors, setErrors] = useState(serverErrors);
  useEffect(() => setErrors(serverErrors), [serverErrors]); // Keep server/client errors in sync

  // Manage form errors.
  const { autoObserve, configure, validateField, validateFields } = useMemo(() => {
    return createFormValidityObserver("focusout", {
      defaultErrors: { required: (field: ValidatableField) => `${field.labels?.[0].textContent} is required` },
      renderByDefault: true,
      renderer(errorContainer, errorMessage) {
        const fieldName = errorContainer.id.replace(/-error$/, "");
        setErrors((e) => ({ ...e, [fieldName]: errorMessage }));
      },
    });
  }, []);

  const formRef = useMemo(autoObserve, [autoObserve]);
  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (validateFields({ focus: true })) submit(form);
    },
    [submit, validateFields],
  );

  if (mode === "success") {
    return (
      <main>
        <div className="auth-card">
          <h1>Success!</h1>
          <p>Your password has been updated successfully</p>
          <Link className="btn" href={`/pages${commonRoutes.login}`}>
            SIGN IN
          </Link>
        </div>
      </main>
    );
  }

  if (mode === "attempt") {
    return (
      <main>
        <form ref={formRef} method="post" onSubmit={handleSubmit}>
          <h1>Change your password</h1>
          <h2>Enter a new password below to change your password</h2>
          {errors?.banner && <div role="alert">{errors?.banner}</div>}

          <label htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            placeholder="New password"
            required
            aria-invalid={!!errors?.password}
            aria-describedby="password-error"
            {...configure("password", {
              pattern: {
                value: "(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}",
                message: "Password must contain at least 8 characters, including a number",
              },
              validate(input: HTMLInputElement) {
                const confirmPassword = input.form?.elements.namedItem("confirm-password") as HTMLInputElement;
                if (confirmPassword.value) validateField(confirmPassword.name);
              },
            })}
          />
          <div id="password-error" role="alert">
            {errors?.password}
          </div>

          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            placeholder="Confirm your password"
            required
            aria-invalid={!!errors?.["confirm-password"]}
            aria-describedby="confirm-password-error"
            {...configure("confirm-password", {
              validate(input: HTMLInputElement) {
                const password = input.form?.elements.namedItem("password") as HTMLInputElement;
                if (input.value !== password.value) return "Confirmation password doesn't match";
              },
            })}
          />
          <div id="confirm-password-error" role="alert">
            {errors?.["confirm-password"]}
          </div>

          <input name="mode" type="hidden" value={mode} />
          {!!token && <input name="token" type="hidden" value={token} />}
          <button type="submit">CHANGE PASSWORD</button>
        </form>
      </main>
    );
  }

  if (mode === "emailed") {
    return (
      <main>
        <div className="auth-card">
          Please check your email for the password recovery link.{" "}
          <Link href={`/pages${commonRoutes.resetPassword}`}>Resend</Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <form ref={formRef} method="post" onSubmit={handleSubmit}>
        <h1>Reset your password</h1>
        <h2>We will send you an email to reset your password</h2>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          required
          aria-invalid={!!errors?.email}
          aria-describedby="email-error"
          {...configure("email", { type: { value: "email", message: "Email is invalid" } })}
        />
        <div id="email-error" role="alert">
          {errors?.email}
        </div>

        <input name="mode" type="hidden" value={mode} />
        <button type="submit">Email me</button>
      </form>
    </main>
  );
}

/* -------------------- Server -------------------- */
interface ServerData {
  loader: { mode: "request" | "emailed" | "attempt" | "success"; token?: string };
  action?: { [key in "banner" | "email" | "password" | "confirm-password"]?: string | null };
}

export const getServerSideProps = (async ({ req, query, res }) => {
  await import("@/lib/server/supertokens/initialize"); // Server-only side-effect

  const { user } = getGlobalServerData(req);
  if (user) return redirect(req, res, "/pages", 303);

  if (req.method === "GET") return { props: { loader: getLoaderData(query) } };

  if (req.method === "POST") {
    const formData = Object.fromEntries(await getFormData(req));
    const { mode } = formData;

    if (mode === "request") {
      // Form Data
      const { email } = formData;

      if (!email) {
        res.statusCode = 400;
        return { props: { loader: getLoaderData(query), action: { email: "Email is required" } } };
      } else if (!validateEmail(email)) {
        res.statusCode = 400;
        return { props: { loader: getLoaderData(query), action: { email: "Email is invalid " } } };
      }

      // Email a "reset password" link (or fail silently for invalid users/emails)
      await SuperTokensHelpers.sendPasswordResetEmail(email);
      return redirect(req, res, `/pages${commonRoutes.resetPassword}?mode=emailed`, 303);
    }

    // Reset user's password
    if (mode === "attempt") {
      // Form Data
      const { password, "confirm-password": confirmPassword, token = "" } = formData;

      // Validate Data
      const errors: ServerData["action"] = {};
      if (!password) errors.password = "New password is required";
      else if (!validatePassword(password)) {
        errors.password = "Password must contain at least 8 characters, including a number";
      }

      if (!confirmPassword) errors["confirm-password"] = "Confirm password is required";
      else if (password !== confirmPassword) errors["confirm-password"] = "Confirmation password doesn't match";

      if (errors.password || errors["confirm-password"]) {
        res.statusCode = 400;
        return { props: { loader: getLoaderData(query), action: errors } };
      }

      // Validate Token
      if (!token) {
        res.statusCode = 401;
        return { props: { loader: getLoaderData(query), action: { banner: "Invalid password reset link" } } };
      }

      const status = await SuperTokensHelpers.resetPassword(token, password);
      if (status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") {
        res.statusCode = 401;
        return { props: { loader: getLoaderData(query), action: { banner: "Invalid password reset link" } } };
      }

      // Password reset succeeded
      return redirect(req, res, `/pages${commonRoutes.resetPassword}?mode=success`, 303);
    }

    res.statusCode = 400;
    return { props: { loader: getLoaderData(query), action: { banner: "Invalid Requeset" } } };
  }

  return methodNotAllowed(res, "GET, POST");
}) satisfies GetServerSideProps<ServerData>;

function getLoaderData(query: ParsedUrlQuery): ServerData["loader"] {
  const token = typeof query.token === "string" ? query.token : "";

  let mode: ServerData["loader"]["mode"];
  if (token) mode = "attempt";
  else if (typeof query.mode === "string") mode = query.mode as typeof mode;
  else mode = "request";

  return { mode, token };
}
