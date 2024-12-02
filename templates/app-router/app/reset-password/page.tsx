"use client";

// Primary Imports
import Link from "next/link";
import { use, useActionState, useState, useEffect, useMemo, startTransition } from "react";
import { createFormValidityObserver } from "@form-observer/react";
import { getServerActionProps } from "@/lib/utils/nextisms";
import { commonRoutes } from "@/lib/utils/constants";
import { sendEmail, resetPassword } from "./actions";

// Styles
import "@/app/auth-form.scss";

interface PageProps {
  searchParams: Promise<{
    mode: "request" | "emailed" | "success";
    /** Token used for resetting a user's password */
    token: string | null;
  }>;
}

export default function ResetPassword(props: PageProps) {
  const searchParams = use(props.searchParams);
  const { mode, token } = searchParams;

  const [sendEmailErrors, sendEmailAction] = useActionState(sendEmail, {});
  const [resetPasswordErrors, resetPasswordAction] = useActionState(resetPassword, {});

  // Keep server/client errors in sync
  const [errors, setErrors] = useState({ ...sendEmailErrors, ...resetPasswordErrors });
  useEffect(() => setErrors(sendEmailErrors), [sendEmailErrors]);
  useEffect(() => setErrors(resetPasswordErrors), [resetPasswordErrors]);

  // Manage form errors.
  const required = (field: HTMLInputElement) => `${field.labels?.[0].textContent} is required`;
  const { autoObserve, configure, validateField, validateFields } = useMemo(() => {
    return createFormValidityObserver("focusout", {
      renderByDefault: true,
      renderer(errorContainer, errorMessage) {
        const fieldName = errorContainer.id.replace(/-error$/, "");
        setErrors((e) => ({ ...e, [fieldName]: errorMessage }));
      },
    });
  }, []);

  const formRef = useMemo(autoObserve, [autoObserve]);
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateFields({ focus: true })) return;

    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      if (token) return resetPasswordAction(formData);
      return sendEmailAction(formData);
    });
  }

  if (mode === "success") {
    return (
      <main>
        <div className="auth-card">
          <h1>Success!</h1>
          <p>Your password has been updated successfully</p>
          <Link className="btn" href={commonRoutes.login}>
            SIGN IN
          </Link>
        </div>
      </main>
    );
  }

  if (token) {
    return (
      <main>
        <form ref={formRef} {...getServerActionProps(resetPasswordAction)} onSubmit={handleSubmit}>
          <h1>Change your password</h1>
          <h2>Enter a new password below to change your password</h2>
          {errors.banner && <div role="alert">{errors.banner}</div>}

          <label htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            placeholder="New password"
            aria-invalid={!!errors.password}
            aria-describedby="password-error"
            {...configure("password", {
              required,
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
            {errors.password}
          </div>

          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            placeholder="Confirm your password"
            aria-invalid={!!errors["confirm-password"]}
            aria-describedby="confirm-password-error"
            {...configure("confirm-password", {
              required,
              validate(input: HTMLInputElement) {
                const password = input.form?.elements.namedItem("password") as HTMLInputElement;
                if (input.value !== password.value) return "Confirmation password doesn't match";
              },
            })}
          />
          <div id="confirm-password-error" role="alert">
            {errors["confirm-password"]}
          </div>

          <input name="token" type="hidden" value={token} />
          <button type="submit">CHANGE PASSWORD</button>
        </form>
      </main>
    );
  }

  if (mode === "emailed") {
    return (
      <main>
        <div className="auth-card">
          Please check your email for the password recovery link. <Link href={commonRoutes.resetPassword}>Resend</Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <form ref={formRef} {...getServerActionProps(sendEmailAction)} onSubmit={handleSubmit}>
        <h1>Reset your password</h1>
        <h2>We will send you an email to reset your password</h2>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          aria-invalid={!!errors.email}
          aria-describedby="email-error"
          {...configure("email", { required, type: { value: "email", message: "Email is invalid" } })}
        />
        <div id="email-error" role="alert">
          {errors.email}
        </div>

        <button type="submit">Email me</button>
      </form>
    </main>
  );
}
