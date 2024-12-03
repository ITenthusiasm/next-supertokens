import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { parse, serialize } from "cookie";
import { useFormAction } from "@/lib/utils/hooks";
import SuperTokensHelpers from "@/lib/server/supertokens";
import { getGlobalServerData, getFormData, convertQueryToSearchParams } from "@/lib/server/requestHelpers";
import { redirect, methodNotAllowed } from "@/lib/server/responseHelpers";
import {
  createCookiesFromTokens,
  createCookieSettings,
  deleteCookieSettings,
} from "@/lib/server/supertokens/cookieHelpers";
import { commonRoutes } from "@/lib/utils/constants";

/* -------------------- Browser -------------------- */
export default function ThirdPartyLogin({ loader, action }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [formErrors, submit] = useFormAction(action);
  const error = loader?.banner ?? formErrors?.banner;

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>): void {
    event.preventDefault();
    submit(event.currentTarget, event.nativeEvent.submitter);
  }

  return (
    <main>
      <form method="post" onSubmit={handleSubmit}>
        <h1>Sign In / Sign Up</h1>
        <hr className="two-sided-margin" />
        {error && <div role="alert">{error}</div>}

        <ul className="providers">
          <li>
            <button name="provider" type="submit" value="github">
              <img src="/logos/github.png" alt="GitHub Logo" aria-hidden="true" />
              Continue with GitHub
            </button>
          </li>

          <li>
            <button name="provider" type="submit" value="planningcenter">
              <img src="/logos/planning-center.svg" alt="Planning Center Logo" aria-hidden="true" />
              Continue with Planning Center
            </button>
          </li>
        </ul>
      </form>
    </main>
  );
}

/* -------------------- Server -------------------- */
interface ServerData {
  loader: { banner: string } | null;
  action?: { banner: string } | null;
}

const pkceCookieName = "sPKCE";
const deletePkceCookieSettings = { ...deleteCookieSettings, path: commonRoutes.loginThirdParty };

export const getServerSideProps = (async ({ req, query, res }) => {
  await import("@/lib/server/supertokens/initialize"); // Server-only Side-effect

  const { user } = getGlobalServerData(req);
  if (user) return redirect(req, res, "/", 303);

  if (req.method === "GET") {
    const searchParams = convertQueryToSearchParams(query);

    // User is visiting Login Page
    if (!searchParams.has("provider")) return { props: { loader: null } };

    // User is being redirected from Provider's Login Page
    const pkceCodeVerifier = parse(req.headers.cookie ?? "")[pkceCookieName];
    const { status, tokens } = await SuperTokensHelpers.thirdPartySignin(searchParams, pkceCodeVerifier);

    // Auth Failed
    if (status === "UNRECOGNIZED_PROVIDER") {
      res.statusCode = 400;
      return { props: { loader: { banner: "Provider was not recognized" } } };
    }

    if (status === "NO_EMAIL_FOUND_FOR_USER") {
      res.statusCode = 400;
      return { props: { loader: { banner: "Account lacks a valid email" } } };
    }

    if (status === "EMAIL_NOT_VERIFIED") {
      res.statusCode = 403;
      return { props: { loader: { banner: "Email not verified with provider" } } };
    }

    if (status === "SIGN_IN_UP_NOT_ALLOWED") {
      res.statusCode = 403;
      return { props: { loader: { banner: "Account was rejected" } } };
    }

    if (status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR") {
      res.statusCode = 403;
      return { props: { loader: { banner: "Unsupported email change detected" } } };
    }

    // Either our implementation is incorrect, or an error status was not handled properly.
    if (status !== "OK") {
      res.statusCode = 500;
      return { props: { loader: { banner: "Authorization failed" } } };
    }

    // Auth succeeded. Set auth tokens and clear PKCE data.
    const cookies = createCookiesFromTokens(tokens);
    cookies.push(serialize(pkceCookieName, "", deletePkceCookieSettings));
    res.setHeader("Set-Cookie", cookies);

    return redirect(req, res, query.returnUrl?.toString() || "/", 303);
  }

  if (req.method === "POST") {
    const returnUrl = query.returnUrl?.toString() ?? null;
    const provider = (await getFormData(req)).get("provider");
    const normalizedProvider = typeof provider === "string" ? provider : "";
    const redirectDetails = await SuperTokensHelpers.getThirdPartyRedirectDetails(normalizedProvider, returnUrl);

    // Provider was not recognized. (This should only happen if there is a bug in our code or the user is malicious.)
    if (redirectDetails === null) {
      res.statusCode = 500;
      return { props: { loader: null, action: { banner: "Could not authorize with provider" } } };
    }

    // Redirect user to Provider's Login Page
    const { redirectUrl, pkceCodeVerifier } = redirectDetails;

    if (pkceCodeVerifier) {
      res.setHeader("Set-Cookie", serialize(pkceCookieName, pkceCodeVerifier, createCookieSettings("pkce")));
    }

    return redirect(req, res, redirectUrl, 303);
  }

  return methodNotAllowed(res, "GET, POST");
}) satisfies GetServerSideProps<ServerData>;
