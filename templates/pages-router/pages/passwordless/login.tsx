import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import type { IncomingMessage } from "node:http";
import type { ParsedUrlQuery } from "node:querystring";
import { serialize, parse } from "cookie";
import { useState, useEffect, useMemo } from "react";
import { createFormValidityObserver } from "@form-observer/react";
import { useFormAction } from "@/lib/utils/hooks";
import SuperTokensHelpers from "@/lib/server/supertokens";
import type { PasswordlessFlow } from "@/lib/server/supertokens";
import { getGlobalServerData, getFormData } from "@/lib/server/requestHelpers";
import { redirect, methodNotAllowed } from "@/lib/server/responseHelpers";
import {
  deviceCookieNames,
  createCookiesFromTokens,
  createCookieSettings,
  deleteCookieSettings,
} from "@/lib/server/supertokens/cookieHelpers";
import { validateEmail, validatePhone } from "@/lib/utils/validation";
import { commonRoutes } from "@/lib/utils/constants";

/* -------------------- Browser -------------------- */
export default function PasswordlessLogin({ loader, action }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { mode, contact } = loader;
  const [serverErrors, submit] = useFormAction(action);
  const [errors, setErrors] = useState(serverErrors);
  useEffect(() => setErrors(serverErrors), [serverErrors]); // Keep server/client errors in sync

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
  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    if (validateFields({ focus: true })) submit(form);
  }

  // Note: Users will only get here if their Login Link is invalid
  if (mode === "link-signin") {
    return (
      <main>
        <div className="auth-card">
          <h1>Invalid Login Link</h1>
          <p>
            This login link is either expired or invalid. <br aria-hidden="true" />
            Please use a different one.
          </p>
        </div>
      </main>
    );
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
        <form ref={formRef} method="post" onSubmit={handleSubmit}>
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

          <input name="mode" type="hidden" value={mode} />
          <button type="submit">Sign In</button>
        </form>
      </main>
    );
  }

  return (
    <main>
      <form ref={formRef} method="post" onSubmit={handleSubmit}>
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

        <input name="mode" type="hidden" value={mode} />
        <button type="submit">Continue</button>
      </form>
    </main>
  );
}

/* -------------------- Server -------------------- */
interface ServerData {
  loader: {
    mode: "request" | "code-signin" | "link-signin" | "messaged";
    contact: "email" | "phoneNumber";
  };
  action?: { [key in "banner" | "email" | "phoneNumber" | "code"]?: string | null };
}

export const getServerSideProps = (async ({ req, query, resolvedUrl, res }) => {
  await import("@/lib/server/supertokens/initialize"); // Server-only Side-effect

  const { user } = getGlobalServerData(req);
  if (user) return redirect(req, res, "/", 303);

  if (req.method === "GET") {
    const token = query.token?.toString();

    // User is visiting a page
    if (!token) return { props: { loader: getLoaderData(query) } };

    // User is attempting to sign-in with a link (indicated by `token`)
    const { cookies, status } = await attemptSigninWith(req, token, true);

    // Sign-in failed
    if (!cookies) {
      res.statusCode = status;
      return { props: { loader: getLoaderData(query) } };
    }

    // Sign-in succeeded
    res.setHeader("Set-Cookie", cookies);
    return redirect(req, res, query.returnUrl?.toString() || "/", 303);
  }

  if (req.method === "POST") {
    // Form Data
    const formData = Object.fromEntries(await getFormData(req));
    const { mode } = formData;

    if (mode === "request") {
      // Note: Type casting is just for convenience. We expect EITHER `email` OR `phoneNumber` to be provided. Not both.
      const { email, phoneNumber } = formData as Record<string, string>;

      // Only troublesome users will get here.
      if (email == null && phoneNumber == null) {
        res.statusCode = 400;
        return {
          props: { loader: getLoaderData(query), action: { banner: "Please provide an email or a phone number" } },
        };
      }

      // Only troublesome users will get here too.
      if (email != null && phoneNumber != null) {
        res.statusCode = 400;
        return {
          props: {
            loader: getLoaderData(query),
            action: { banner: "You may provide an email or a phone number, but not both" },
          },
        };
      }

      if (email != null) {
        if (!email) {
          res.statusCode = 400;
          return { props: { loader: getLoaderData(query), action: { email: "Email is required" } } };
        }

        if (!validateEmail(email)) {
          res.statusCode = 400;
          return { props: { loader: getLoaderData(query), action: { email: "Email is invalid" } } };
        }
      }

      if (phoneNumber != null) {
        if (!phoneNumber) {
          res.statusCode = 400;
          return { props: { loader: getLoaderData(query), action: { phoneNumber: "Phone Number is required" } } };
        }

        if (!validatePhone(phoneNumber)) {
          res.statusCode = 400;
          return { props: { loader: getLoaderData(query), action: { phoneNumber: "Phone Number is invalid" } } };
        }
      }

      // Send a code/link
      const flow: PasswordlessFlow = "both" as PasswordlessFlow; // Note: You can change this depending on your needs.
      const code = await SuperTokensHelpers.sendPasswordlessInvite({ email, phoneNumber, flow });

      // Redirect to relevant page (with Device Details), preserving `returnUrl` if it previously existed
      const cookieSettings = createCookieSettings("device");
      res.setHeader("Set-Cookie", [
        serialize(deviceCookieNames.deviceId, code.deviceId, cookieSettings),
        serialize(deviceCookieNames.preAuthSessionId, code.preAuthSessionId, cookieSettings),
      ]);

      const url = new URL(resolvedUrl, "https://example.com/");
      url.searchParams.set("mode", flow === "link" ? "messaged" : "code-signin");
      if (flow === "link") url.searchParams.delete("returnUrl"); // `returnUrl` is no longer relevant in this case

      return redirect(req, res, `${url.pathname}${url.search}`, 303);
    }

    if (mode === "code-signin") {
      const { code } = formData;
      if (!code) {
        res.statusCode = 400;
        return { props: { loader: getLoaderData(query), action: { code: "Code is required" } } };
      }

      const { cookies, status, errors } = await attemptSigninWith(req, code);

      // Sign-in failed
      if (!cookies) {
        res.statusCode = status;
        return { props: { loader: getLoaderData(query), action: errors } };
      }

      // Sign-in succeeded
      res.setHeader("Set-Cookie", cookies);
      return redirect(req, res, query.returnUrl?.toString() || "/", 303);
    }
  }

  return methodNotAllowed(res, "GET, POST");
}) satisfies GetServerSideProps<ServerData>;

function getLoaderData(query: ParsedUrlQuery): ServerData["loader"] {
  const token = query.token?.toString();
  let mode: ServerData["loader"]["mode"];

  if (token) mode = "link-signin";
  else if (query.mode) mode = query.mode.toString() as typeof mode;
  else mode = "request";

  const contact = query.contact?.toString() === "phoneNumber" ? "phoneNumber" : "email";
  return { mode, contact };
}

// TODO: SuperTokens seems to `THROW` an error when there's a bad `preAuthSessionId`. This issue has been
// reported to the SuperTokens team and is unexpected behavior. We'll need to wait for them to supply a fix.
const deleteDeviceCookieSettings = { ...deleteCookieSettings, path: commonRoutes.loginPasswordless };
async function attemptSigninWith(
  request: IncomingMessage,
  code: string,
  link?: boolean,
): Promise<PasswordlessSigninResult> {
  // Get Credentials
  const requestCookies = parse(request.headers.cookie ?? "");
  const deviceId = requestCookies[deviceCookieNames.deviceId] ?? "";
  const preAuthSessionId = requestCookies[deviceCookieNames.preAuthSessionId] ?? "";

  // Validate Code
  const credentials = link ? { linkCode: code, preAuthSessionId } : { userInputCode: code, deviceId, preAuthSessionId };
  const { status, tokens } = await SuperTokensHelpers.passwordlessSignin(credentials);

  // Auth Failed
  if (status === "RESTART_FLOW_ERROR") return { errors: { banner: "Please request a new code" }, status: 401 };
  if (status === "EXPIRED_USER_INPUT_CODE_ERROR") return { errors: { code: "This code has expired" }, status: 401 };
  if (status === "LINKING_TO_SESSION_USER_FAILED") return { errors: { banner: "Account linking failed" }, status: 400 };
  if (status !== "OK") return { errors: { code: "Code is invalid " }, status: 401 };

  // Auth succeeded. Set auth tokens and clear device data.
  const responseCookies = createCookiesFromTokens(tokens);
  responseCookies.push(serialize(deviceCookieNames.deviceId, "", deleteDeviceCookieSettings));
  responseCookies.push(serialize(deviceCookieNames.preAuthSessionId, "", deleteDeviceCookieSettings));
  return { cookies: responseCookies };
}

type PasswordlessSigninResult =
  | { cookies: string[]; status?: undefined; errors?: undefined }
  | { cookies?: undefined; status: number; errors: Required<ServerData>["action"] };
