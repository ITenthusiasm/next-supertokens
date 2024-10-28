"use client";

// Primary Imports
import Link from "next/link";
import { use, useActionState } from "react";
import { sendEmailAction, passwordResetAction } from "./actions";
import { commonRoutes } from "@/lib/utils/constants";

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
  const [attemptErrors, attemptAction] = useActionState(passwordResetAction, {});
  const [requestErrors, requestAction] = useActionState(sendEmailAction, {});

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
        <form ref={onFormMount} action={attemptAction}>
          <h1>Change your password</h1>
          <h2>Enter a new password below to change your password</h2>
          {attemptErrors.banner && <div role="alert">{attemptErrors.banner}</div>}

          <label htmlFor="password">New password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="New password"
            pattern="(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}"
            required
            aria-invalid={!!attemptErrors.password}
            aria-describedby="password-error"
          />
          <div id="password-error" role="alert">
            {attemptErrors.password}
          </div>

          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            placeholder="Confirm your password"
            required
            aria-invalid={!!attemptErrors["confirm-password"]}
            aria-describedby="confirm-password-error"
          />
          <div id="confirm-password-error" role="alert">
            {attemptErrors["confirm-password"]}
          </div>

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
          Please check your email for the password recovery link. <Link href={commonRoutes.resetPassword}>Resend</Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <form ref={onFormMount} action={requestAction}>
        <h1>Reset your password</h1>
        <h2>We will send you an email to reset your password</h2>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          aria-invalid={!!requestErrors.email}
          aria-describedby="email-error"
        />
        <div id="email-error" role="alert">
          {requestErrors.email}
        </div>

        <button type="submit">Email me</button>
      </form>
    </main>
  );
}

function onFormMount(ref: HTMLFormElement): void {
  ref.noValidate = true;
}
