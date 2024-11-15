import { redirect } from "next/navigation";
import { getGlobalServerData } from "@/lib/server/requestHelpers";

export default async function ResetPasswordGuard({ children }: { children: React.ReactNode }) {
  if ((await getGlobalServerData()).user) throw redirect("/");
  return children;
}
