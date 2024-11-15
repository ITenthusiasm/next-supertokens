"use server";

import { headers } from "next/headers";
import { SERVER_DATA_HEADER } from "@/lib/utils/constants";

export async function getGlobalServerData(): Promise<GlobalServerData> {
  const headersMap = await headers();
  return JSON.parse(headersMap.get(SERVER_DATA_HEADER) as string) as GlobalServerData;
}
