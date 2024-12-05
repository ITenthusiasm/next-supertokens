import type { IncomingMessage, ServerResponse } from "node:http";
import type { GetServerSidePropsResult } from "next";
import { JS_REQUEST_HEADER, REDIRECT_LOCATION_HEADER, REDIRECT_STATUS_HEADER } from "@/lib/utils/constants";

export function EmptyPage(): null {
  return null;
}

export const EMPTY_NEXTJS_RESPONSE: GetServerSidePropsResult<never> = { props: {} as never };

export function redirect(
  request: IncomingMessage,
  response: ServerResponse,
  url: string,
  status: 303 | 307 | 308,
): GetServerSidePropsResult<never> {
  if (request.headers[JS_REQUEST_HEADER.toLowerCase()] === "") {
    response.statusCode = 204;
    response.setHeader(REDIRECT_LOCATION_HEADER, url);
    response.setHeader(REDIRECT_STATUS_HEADER, String(status));
    response.end();
    return EMPTY_NEXTJS_RESPONSE;
  }

  return { redirect: { destination: url, statusCode: status } };
}

export function methodNotAllowed(response: ServerResponse, allowedMethods: string): GetServerSidePropsResult<never> {
  response.statusCode = 405;
  response.statusMessage = "Method Not Allowed";
  response.setHeader("Allow", allowedMethods);
  response.end();
  return EMPTY_NEXTJS_RESPONSE;
}
