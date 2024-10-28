import { getGlobalServerData } from "@/lib/server/requestHelpers";
import ClientPrivate from "./page-client";

/* -------------------- Browser -------------------- */
export default async function Private() {
  const { user } = (await getGlobalServerData()) as { user: Required<GlobalServerData>["user"] };
  return <ClientPrivate user={user} />;
}
