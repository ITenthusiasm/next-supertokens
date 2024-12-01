// Primary Imports
import { redirect } from "next/navigation";
import { getGlobalServerData } from "@/lib/server/requestHelpers";
import { attemptSigninWith } from "./actions";
import ClientPasswordlessLogin from "./page-client";

// Styles
import "@/app/auth-form.scss";

export interface PageProps {
  searchParams: Promise<{
    mode: "request" | "code-signin" | "messaged" | (string & {});
    contact: "email" | "phoneNumber" | (string & {});
    token?: string;
  }>;
}

export default async function PasswordlessLogin(props: PageProps) {
  if ((await getGlobalServerData()).user) throw redirect("/");
  const searchParams = await props.searchParams;
  const { token } = searchParams;

  // WARNING: Login via Link DOES NOT work at this time because Cookies can't be set during SSR.
  // See: https://github.com/vercel/next.js/issues/51875
  if (token) {
    // Note: Should redirect unless sign-in fails
    await attemptSigninWith(token, true);

    // Users will only get here if their Login Link is invalid
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

  const { mode } = searchParams;
  const contact = searchParams.contact === "phoneNumber" ? "phoneNumber" : "email";
  return <ClientPasswordlessLogin mode={mode} contact={contact} />;
}
