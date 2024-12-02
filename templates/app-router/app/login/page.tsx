"use client";

// Primary Imports
import Link from "next/link";
import { use, useActionState, useState, useEffect, useMemo, startTransition } from "react";
import { createFormValidityObserver } from "@form-observer/react";
import { getServerActionProps } from "@/lib/utils/nextisms";
import { commonRoutes } from "@/lib/utils/constants";
import { login } from "./actions";

// Styles
import "@/app/auth-form.scss";
import "./login.scss";

interface PageProps {
  searchParams: Promise<{ mode: "signin" | "signup" }>;
}

// TODO: It would be nice if we could do "use client" inside page component:
// https://github.com/vercel/next.js/discussions/54137
export default function LoginPage(props: PageProps) {
  const searchParams = use(props.searchParams);
  const mode = searchParams.mode === "signup" ? "signup" : "signin";

  const [serverErrors, loginAction] = useActionState(login, {});
  const [errors, setErrors] = useState(serverErrors);
  useEffect(() => setErrors(serverErrors), [serverErrors]); // Keep server/client errors in sync
  useEffect(() => setErrors({}), [mode]); // Clear errors when authentication mode changes

  // Manage form errors
  const required = (field: HTMLInputElement) => `${field.labels?.[0].textContent} is required`;
  const { autoObserve, configure, validateFields } = useMemo(() => {
    return createFormValidityObserver("focusout", {
      renderByDefault: true,
      renderer(errorContainer, errorMessage) {
        const fieldName = errorContainer.id.replace(/-error$/, "");
        setErrors((e) => ({ ...e, [fieldName]: errorMessage }));
      },
    });
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const success = await validateFields({ focus: true });

    if (!success) return;
    startTransition(() => loginAction(formData));
  }

  // TODO: Prevent form field resets when submitting with Server Actions
  // See: https://www.robinwieruch.de/react-server-action-reset-form/
  return (
    <main>
      <form ref={useMemo(autoObserve, [autoObserve])} {...getServerActionProps(loginAction)} onSubmit={handleSubmit}>
        <h1>{`Sign ${mode === "signin" ? "In" : "Up"}`}</h1>

        {mode === "signin" ? (
          <h2>
            Not registered yet? <Link href={`${commonRoutes.login}?mode=signup`}>Sign Up</Link>
          </h2>
        ) : (
          <h2>
            Already have an account? <Link href={commonRoutes.login}>Sign In</Link>
          </h2>
        )}

        <hr />
        {!!errors.banner && <div role="alert">{errors.banner}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          placeholder="Email Address"
          aria-invalid={!!errors.email}
          aria-describedby="email-error"
          {...configure("email", {
            required,
            type: { value: "email", message: "Email is invalid" },
            async validate({ value }: HTMLInputElement) {
              // Check email existence for `signup`s
              if (mode !== "signup") return;

              const response = await fetch(`/api/email-exists?email=${value}`);
              const emailExists = (await response.json()) as boolean;
              if (emailExists) return "This email already exists. Please sign in instead.";
            },
          })}
        />
        <div id="email-error" role="alert">
          {errors.email}
        </div>

        <label htmlFor="password">Password</label>
        <input
          id="password"
          placeholder="Password"
          type="password"
          aria-invalid={!!errors.password}
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
          {errors.password}
        </div>

        <input name="mode" type="hidden" value={mode} />
        <button type="submit">{`Sign ${mode === "signin" ? "In" : "Up"}`}</button>

        {mode === "signin" && (
          <Link className="forgot-password" href={commonRoutes.resetPassword}>
            Forgot password?
          </Link>
        )}
      </form>
    </main>
  );
}
