"use client";

// Primary Imports
import Link from "next/link";
import { use, useActionState } from "react";
import { sendEmail, resetPassword } from "./actions";
import { commonRoutes } from "@/lib/utils/constants";

// Styles
import "@/styles/shared/auth-form.scss";

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
        <form ref={onFormMount} action={resetPasswordAction}>
          <h1>Change your password</h1>
          <h2>Enter a new password below to change your password</h2>
          {resetPasswordErrors.banner && <div role="alert">{resetPasswordErrors.banner}</div>}

          <label htmlFor="password">New password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="New password"
            pattern="(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}"
            required
            aria-invalid={!!resetPasswordErrors.password}
            aria-describedby="password-error"
          />
          <div id="password-error" role="alert">
            {resetPasswordErrors.password}
          </div>

          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            placeholder="Confirm your password"
            required
            aria-invalid={!!resetPasswordErrors["confirm-password"]}
            aria-describedby="confirm-password-error"
          />
          <div id="confirm-password-error" role="alert">
            {resetPasswordErrors["confirm-password"]}
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
      <form ref={onFormMount} action={sendEmailAction}>
        <h1>Reset your password</h1>
        <h2>We will send you an email to reset your password</h2>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          aria-invalid={!!sendEmailErrors.email}
          aria-describedby="email-error"
        />
        <div id="email-error" role="alert">
          {sendEmailErrors.email}
        </div>

        <button type="submit">Email me</button>
      </form>
    </main>
  );
}

function onFormMount(ref: HTMLFormElement | null): void {
  if (ref) ref.noValidate = true;
}
