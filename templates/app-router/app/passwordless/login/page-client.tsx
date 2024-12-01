"use client";

import Link from "next/link";
import { useActionState, useState, useEffect, useMemo, startTransition } from "react";
import { createFormValidityObserver } from "@form-observer/react";
import { getServerActionProps } from "@/lib/utils/nextisms";
import { commonRoutes } from "@/lib/utils/constants";
import { login, requestCode } from "./actions";
import type { PageProps } from "./page";

/* -------------------- Browser -------------------- */
interface ClientPasswordlessLoginProps {
  mode: Awaited<PageProps["searchParams"]>["mode"];
  contact: Extract<Awaited<PageProps["searchParams"]>["contact"], "email" | "phoneNumber">;
}

export default function ClientPasswordlessLogin({ mode, contact }: ClientPasswordlessLoginProps) {
  const [requestCodeErrors, requestCodeAction] = useActionState(requestCode, {});
  const [loginErrors, loginAction] = useActionState(login, {});

  // Keep server/client errors in sync
  const [errors, setErrors] = useState({ ...requestCodeErrors, ...loginErrors });
  useEffect(() => setErrors(requestCodeErrors), [requestCodeErrors]);
  useEffect(() => setErrors(loginErrors), [loginErrors]);

  // Manage form errors
  const { autoObserve, configure, validateFields } = useMemo(() => {
    const required = (field: HTMLInputElement) => `${field.labels?.[0].textContent} is required`;

    return createFormValidityObserver("focusout", {
      renderByDefault: true,
      defaultErrors: { required },
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
      if (mode === "code-signin") return loginAction(formData);
      return requestCodeAction(formData);
    });
  }

  // TODO: Consider implementing a `resend` Link
  if (mode === "messaged") {
    return (
      <main>
        <div className="auth-card">
          <h1>{`Check Your ${contact === "email" ? "Email" : "Phone"}`}</h1>
          <p>{`A link was sent to your ${contact === "email" ? "email" : "phone"}. Use it to log in.`}</p>
        </div>
      </main>
    );
  }

  // TODO: Consider implementing a `resend` Button
  if (mode === "code-signin") {
    return (
      <main>
        <form ref={formRef} {...getServerActionProps(loginAction)} onSubmit={handleSubmit}>
          <h1>Enter Verification Code</h1>
          <h2>{`A verification code was sent to your ${contact === "email" ? "email" : "phone"}`}</h2>

          <label htmlFor="code">Code</label>
          <input
            key="code"
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            required
            aria-invalid={!!errors?.code}
            aria-describedby="code-error"
          />
          <div id="code-error" role="alert">
            {errors?.code}
          </div>

          <button type="submit">Sign In</button>
        </form>
      </main>
    );
  }

  return (
    <main>
      <form ref={formRef} {...getServerActionProps(requestCodeAction)} onSubmit={handleSubmit}>
        <h1>Sign Up / Sign In</h1>
        <hr className="two-sided-margin" aria-hidden="true" />

        <div className="@flex @justify-between @items-center">
          <label htmlFor={contact}>{contact === "email" ? "Email" : "Phone Number"}</label>
          <Link href={contact === "email" ? "?contact=phoneNumber" : commonRoutes.loginPasswordless}>
            {`Use ${contact === "email" ? "a Phone Number" : "an Email"}`}
          </Link>
        </div>

        <input
          key="contact"
          id={contact}
          inputMode={contact === "phoneNumber" ? "numeric" : undefined}
          required
          aria-invalid={!!errors?.[contact]}
          aria-describedby={`${contact}-error`}
          {...configure(contact, {
            type: contact === "email" ? { value: "email", message: "Email is invalid" } : "text",
          })}
        />
        <div id={`${contact}-error`} role="alert">
          {errors?.[contact]}
        </div>

        <button type="submit">Continue</button>
      </form>
    </main>
  );
}
