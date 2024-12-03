import { useRouter } from "next/router";
import { useState, useMemo, useCallback } from "react";
import { JS_REQUEST_HEADER, REDIRECT_LOCATION_HEADER, REDIRECT_STATUS_HEADER } from "@/lib/utils/constants";

/**
 * Generates a function that submits the `form` provided to it. The response data retrieved from the form submission
 * is kept up-to-date in the returned state variable.
 *
 * @param {T} initialState The initial state of the server action data
 */
export function useFormAction<T>(
  initialState: T,
): [T, (form: HTMLFormElement, submitter?: SubmitEvent["submitter"]) => Promise<void>] {
  const router = useRouter();
  const [actionState, setActionState] = useState(initialState);

  const submit = useCallback(
    async (form: HTMLFormElement, submitter?: SubmitEvent["submitter"]): Promise<void> => {
      // Create `Request` data
      const formData = new FormData(form, submitter);

      const requestOptions: RequestInit = {
        redirect: "follow",
        mode: "same-origin",
        credentials: "same-origin",
        method: form.method.toUpperCase(),
        headers: { "Content-Type": form.enctype, [JS_REQUEST_HEADER]: "" },
        // See: https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/880
        // @ts-expect-error -- `URLSearchParams` TS constructor has not yet been updated to accept `FormData`
        body: form.enctype === "multipart/form-data" ? formData : new URLSearchParams(formData).toString(),
      };

      // Get response for the submitted form, following any non-altering redirects (307 or 308) as needed
      let response: Response | undefined;
      do response = await fetch(response?.headers.get(REDIRECT_LOCATION_HEADER) ?? form.action, requestOptions);
      while (
        response.headers.get(REDIRECT_STATUS_HEADER) === String(307) ||
        response.headers.get(REDIRECT_STATUS_HEADER) === String(308)
      );

      // Navigate to a different page if we encounter an altering redirect (303)
      if (response.headers.get(REDIRECT_STATUS_HEADER) === String(303)) {
        const redirectPathOrUrl = response.headers.get(REDIRECT_LOCATION_HEADER) as string;
        const url = new URL(redirectPathOrUrl, window.location.origin);

        if (url.origin === window.location.origin) router.push(url);
        else window.location.assign(url);
        return;
      }

      // Extract Server JSON data
      const contentTypes = response.headers.get("Content-Type")?.split("; ");
      if (contentTypes?.includes("application/json")) return setActionState(await response.json());

      // Extract Next.js `get*Props` data
      const template = document.createElement("template");
      template.innerHTML = await response.text();

      // NOTE: This function only automatically updates `action` data, not `loader` data.
      // However, this function can be updated to also update `loader` data automatically.
      const nextData = template.content.querySelector("script#__NEXT_DATA__")?.textContent ?? String(null);
      const serverData = JSON.parse(nextData).props.pageProps;
      setActionState(serverData.action);
    },
    [router.push],
  );

  return useMemo(() => [actionState, submit] as const, [actionState, submit]);
}
