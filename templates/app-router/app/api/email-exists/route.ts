import SuperTokensHelpers from "@/lib/server/supertokens";
import "@/lib/server/supertokens/initialize"; // Side-effect

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const email = url.searchParams.get("email") ?? "";
  const emailExists = await SuperTokensHelpers.emailExists(email);
  return Response.json(emailExists, { status: 200, statusText: "OK" });
}
