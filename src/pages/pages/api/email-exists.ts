import type { GetServerSideProps } from "next";
import SuperTokensHelpers from "@/lib/server/supertokens";
import { methodNotAllowed, EMPTY_NEXTJS_RESPONSE } from "@/lib/server/pages/responseHelpers";

export { EmptyPage as default } from "@/lib/server/pages/responseHelpers";

export const getServerSideProps = (async ({ req, query, res }) => {
  await import("@/lib/server/supertokens/initialize"); // Server-only Side-effect
  if (req.method !== "GET") return methodNotAllowed(res, "GET");

  const rawEmail = query.email;
  const email = typeof rawEmail === "string" ? rawEmail : "";
  const emailExists = await SuperTokensHelpers.emailExists(email);

  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(emailExists));
  return EMPTY_NEXTJS_RESPONSE;
}) satisfies GetServerSideProps<never>;
