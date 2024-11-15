import type { NextApiRequest, NextApiResponse } from "next";
import SuperTokensHelpers from "@/lib/server/supertokens";
import { methodNotAllowed } from "@/lib/server/responseHelpers";

export default async function emailExists(req: NextApiRequest, res: NextApiResponse<boolean>) {
  await import("@/lib/server/supertokens/initialize"); // Server-only Side-effect
  if (req.method !== "GET") return methodNotAllowed(res, "GET");

  const rawEmail = req.query.email;
  const email = typeof rawEmail === "string" ? rawEmail : "";
  const emailExists = await SuperTokensHelpers.emailExists(email);

  res.status(200).json(emailExists);
}
