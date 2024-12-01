/**
 * Generates the `<form>` props needed to require Form Server Actions to be run manually when JS is available
 * on the client side. These props are carefully generated to prevent Hydration Errors in React.
 */
export function getServerActionProps(action: Exclude<Required<React.ComponentProps<"form">>["action"], string>) {
  return {
    action: typeof window === "undefined" ? action : "",
    encType: "multipart/form-data",
    method: "POST",
  } as const satisfies React.ComponentProps<"form">;
}
