// TODO: Still not working for `SuperTokens` as expected. Works for other things, though...
export async function register() {
  await import("@/lib/server/supertokens/initialize");
}
