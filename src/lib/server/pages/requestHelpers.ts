import type { IncomingMessage } from "node:http";
import { SERVER_DATA_HEADER } from "@/lib/utils/constants";

export function getGlobalServerData(request: IncomingMessage): GlobalServerData {
  return JSON.parse(request.headers[SERVER_DATA_HEADER.toLowerCase()] as string) as GlobalServerData;
}

/**
 * Returns the URL-encoded `FormData` in the provided `request` object as a `URLSearchParams` instance.
 * (Assumes that the `enctype` for the submitted <form> is `application/x-www-form-urlencoded`, which is the default.)
 */
export function getFormData(request: IncomingMessage): Promise<URLSearchParams> {
  let resolve: Parameters<ConstructorParameters<typeof Promise<URLSearchParams>>[0]>[0];
  let reject: Parameters<ConstructorParameters<typeof Promise>[0]>[1];
  const promise = new Promise<URLSearchParams>((_resolve, _reject) => ((resolve = _resolve), (reject = _reject)));

  let urlEncodedFormData = "";
  request.on("data", (chunk) => (urlEncodedFormData += chunk));
  request.once("end", () => resolve(new URLSearchParams(urlEncodedFormData)));
  request.once("error", (error) => reject(error));

  return promise;
}
