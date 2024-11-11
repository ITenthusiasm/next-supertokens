"use client";

// Primary Imports
import Link from "next/link";
import { use, useActionState } from "react";
import { commonRoutes } from "@/lib/utils/constants";
import { login } from "./actions";

// Styles
import "@/styles/shared/auth-form.scss";
import "@/styles/routes/login.scss";

interface PageProps {
  searchParams: Promise<{ mode: "signin" | "signup" }>;
}

// TODO: It would be nice if we could do "use client" inside page component:
// https://github.com/vercel/next.js/discussions/54137
export default function LoginPage(props: PageProps) {
  const searchParams = use(props.searchParams);
  const mode = searchParams.mode === "signup" ? "signup" : "signin";
  const [errors, loginAction] = useActionState(login, {});

  // TODO: Is it possible to prevent form field resets when submitting with Server Actions?
  // See: https://www.robinwieruch.de/react-server-action-reset-form/
  return (
    <main>
      <form ref={onFormMount} action={loginAction}>
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
        {/* TODO: Remove/reset `error.banner` when user does `Signin` --> `Signup` --> `Signin` */}
        {!!errors?.banner && mode !== "signup" && <div role="alert">{errors.banner}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          placeholder="Email Address"
          type="email"
          required
          aria-invalid={!!errors?.email}
          aria-describedby="email-error"
        />
        <div id="email-error" role="alert">
          {errors.email}
        </div>

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          placeholder="Password"
          type="password"
          pattern="(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}"
          required
          aria-invalid={!!errors?.password}
          aria-describedby="password-error"
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

function onFormMount(ref: HTMLFormElement | null): void {
  if (ref) ref.noValidate = true;
}
