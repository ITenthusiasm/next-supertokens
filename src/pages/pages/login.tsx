// Primary imports
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
import { createCookiesFromTokens } from "@/lib/server/supertokens/cookieHelpers";
import { validateEmail, validatePassword } from "@/lib/utils/validation";
import { commonRoutes } from "@/lib/utils/constants";

// Styles
import "@/styles/shared/auth-form.scss";
import "@/styles/routes/login.scss";

/* -------------------- Browser -------------------- */
export default function LoginPage({ loader, action }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { mode } = loader;
  const [serverErrors, submit] = useFormAction(action);
  const [errors, setErrors] = useState(serverErrors);
  useEffect(() => setErrors(serverErrors), [serverErrors]); // Keep server/client errors in sync
  useEffect(() => setErrors(undefined), [mode]); // Clear errors when authentication mode changes

  // Manage form errors
  const required = (field: ValidatableField) => `${field.labels?.[0].textContent} is required`;
  const { autoObserve, configure, validateFields } = useMemo(() => {
    return createFormValidityObserver("focusout", {
      renderByDefault: true,
      renderer(errorContainer, errorMessage) {
        const fieldName = errorContainer.id.replace(/-error$/, "");
        setErrors((e) => ({ ...e, [fieldName]: errorMessage }));
      },
    });
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const form = event.currentTarget;
      if (await validateFields({ focus: true })) submit(form);
    },
    [submit, validateFields],
  );

  return (
    <main>
      <form ref={useMemo(autoObserve, [autoObserve])} method="post" onSubmit={handleSubmit}>
        <h1>{`Sign ${mode === "signin" ? "In" : "Up"}`}</h1>

        {mode === "signin" ? (
          <h2>
            Not registered yet? <Link href="?mode=signup">Sign Up</Link>
          </h2>
        ) : (
          <h2>
            Already have an account? <Link href={`/pages${commonRoutes.login}`}>Sign In</Link>
          </h2>
        )}

        <hr />
        {errors?.banner && <div role="alert">{errors.banner}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          placeholder="Email Address"
          aria-invalid={!!errors?.email}
          aria-describedby="email-error"
          {...configure("email", {
            required,
            type: { value: "email", message: "Email is invalid" },
            async validate({ value }: HTMLInputElement) {
              // Check email existence for `signup`s
              if (mode !== "signup") return;

              const response = await fetch(`/pages/api/email-exists?email=${value}`);
              const emailExists = (await response.json()) as boolean;
              if (emailExists) return "This email already exists. Please sign in instead.";
            },
          })}
        />
        <div id="email-error" role="alert">
          {errors?.email}
        </div>

        <label htmlFor="password">Password</label>
        <input
          id="password"
          placeholder="Password"
          type="password"
          aria-invalid={!!errors?.password}
          aria-describedby="password-error"
          {...configure("password", {
            required,
            pattern:
              mode === "signin"
                ? undefined
                : {
                    value: "(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}",
                    message: "Password must contain at least 8 characters, including a number",
                  },
          })}
        />
        <div id="password-error" role="alert">
          {errors?.password}
        </div>

        <input name="mode" type="hidden" value={mode} />
        <button type="submit">{`Sign ${mode === "signin" ? "In" : "Up"}`}</button>

        {mode === "signin" && (
          <Link className="forgot-password" href={`/pages${commonRoutes.resetPassword}`}>
            Forgot password?
          </Link>
        )}
      </form>
    </main>
  );
}

/* -------------------- Server -------------------- */
interface ServerData {
  loader: { mode: "signin" | "signup" };
  action?: { [key in "banner" | "email" | "password"]?: string | null };
}

export const getServerSideProps = (async ({ req, query, res }) => {
  await import("@/lib/server/supertokens/initialize"); // Server-only Side-effect

  const { user } = getGlobalServerData(req);
  if (user) return redirect(req, res, "/pages", 303);

  if (req.method === "GET") return { props: { loader: getLoaderData(query) } };

  if (req.method === "POST") {
    // Form Data
    const formData = await getFormData(req);
    const { email, password, mode } = Object.fromEntries(formData) as Record<string, string>;

    // Validate Data
    const errors: ServerData["action"] = {};
    if (!email) errors.email = "Email is required";
    else if (!validateEmail(email)) errors.email = "Email is invalid";

    if (!password) errors.password = "Password is required";
    else if (mode === "signup" && !validatePassword(password)) {
      errors.password = "Password must contain at least 8 characters, including a number";
    }

    if (errors.email || errors.password) {
      res.statusCode = 400;
      return { props: { loader: getLoaderData(query), action: errors } };
    }

    // Attempt Sign In / Sign Up
    const normalizedMode = mode === "signup" ? "signup" : "signin";
    const { status, tokens } = await SuperTokensHelpers[normalizedMode](email, password);

    // Auth failed
    if (status === "WRONG_CREDENTIALS_ERROR") {
      res.statusCode = 401;
      return {
        props: { loader: getLoaderData(query), action: { banner: "Incorrect email and password combination" } },
      };
    }

    if (status === "EMAIL_ALREADY_EXISTS_ERROR") {
      res.statusCode = 400;
      return {
        props: {
          loader: getLoaderData(query),
          action: { email: "This email already exists. Please sign in instead." },
        },
      };
    }

    // Auth succeeded
    res.setHeader("Set-Cookie", createCookiesFromTokens(tokens));
    return redirect(req, res, query.returnUrl?.toString() || "/pages", 303);
  }

  return methodNotAllowed(res, "GET, POST");
}) satisfies GetServerSideProps<ServerData>;

function getLoaderData(query: ParsedUrlQuery): ServerData["loader"] {
  return { mode: query.mode === "signup" ? "signup" : "signin" };
}
