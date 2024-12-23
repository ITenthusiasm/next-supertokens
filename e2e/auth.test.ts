import { test as base, expect } from "@playwright/test";
import type { Page, BrowserContext, Locator, Cookie, Response } from "@playwright/test";
import { faker } from "@faker-js/faker";
import type { Tokens } from "../src/lib/server/supertokens/cookieHelpers";

/* ---------------------------------------- Playwright Fixtures ---------------------------------------- */
const paths = Object.freeze({
  home: "/",
  private: "/private",
  login: "/login",
  refresh: "/auth/session/refresh",
  passwordReset: "/reset-password",
});

interface Account {
  email: string;
  password: string;
}

interface TestScopedFixtures {
  /** Playwright's built-in `page` fixture, with a user already authenticated in the application */
  pageWithUser: Page;
}

interface WorkerScopedFixtures {
  /** The `email` and `password` details of an already-existing account */
  existingAccount: Account;
}

const it = base.extend<TestScopedFixtures, WorkerScopedFixtures>({
  existingAccount: [
    async ({ browser }, use) => {
      // User Info
      const email = faker.internet.email();
      const password = "1234567a";

      // Create user
      const page = await browser.newPage();
      await visitSignUpPage(page);
      await page.getByRole("textbox", { name: /email/i }).fill(email);
      await page.getByRole("textbox", { name: /password/i }).fill(password);
      await page.getByRole("button", { name: /sign up/i }).click();

      // Cleanup
      await page.getByRole("link", { name: /logout/i }).click();
      await page.close();

      // Provide Worker Fixture Data
      await use({ email, password });
    },
    { scope: "worker" },
  ],
  async pageWithUser({ page, context, existingAccount }, use) {
    // Login
    await page.goto(paths.login);
    await page.getByRole("textbox", { name: /email/i }).fill(existingAccount.email);
    await page.getByRole("textbox", { name: /password/i }).fill(existingAccount.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(paths.home);

    // Expose page after login
    await use(page);

    // Logout
    await page.goto(paths.home);
    const logoutButton = page.getByRole("link", { name: /logout/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForURL(paths.login);
    }

    await expectUserToBeUnauthenticated(context);
  },
});

/* ---------------------------------------- Helper Functions ---------------------------------------- */
async function visitSignUpPage(page: Page): Promise<void> {
  await page.goto(paths.login);
  await page.getByRole("link", { name: /sign up/i }).click();
  await expect(page).toHaveURL(`${paths.login}?mode=signup`);
  await expect(page.getByRole("heading", { name: /sign up/i, level: 1 })).toBeVisible();
}

type AuthTokens = { [K in Extract<keyof Tokens, "accessToken" | "refreshToken">]: Cookie };

/**
 * Retrieves the Auth Tokens belonging to the current user in the application (if any exist).
 * @param context The {@link BrowserContext} of the {@link Page} being tested. (Needed to access browser cookies.)
 * @param required When `true` (default), indicates that all Auth Tokens are expected to exist. If any are missing,
 * the function will `throw`.
 */
async function getAuthTokens(context: BrowserContext, required: false): Promise<Partial<AuthTokens>>;
async function getAuthTokens(context: BrowserContext, required?: true): Promise<AuthTokens>;
async function getAuthTokens(context: BrowserContext, required?: boolean): Promise<AuthTokens | Partial<AuthTokens>> {
  const cookies = await context.cookies();
  const tokens = {
    accessToken: cookies.find((c) => c.name === "sAccessToken"),
    refreshToken: cookies.find((c) => c.name === "sRefreshToken"),
  };

  if (required) {
    expect(tokens.accessToken).toEqual(expect.anything());
    expect(tokens.refreshToken).toEqual(expect.anything());
  }

  return tokens;
}

async function expectUserToBeUnauthenticated(context: BrowserContext): Promise<void> {
  const tokens = await getAuthTokens(context, false);
  expect(tokens.accessToken).toBe(undefined);
  expect(tokens.refreshToken).toBe(undefined);
}

/** Asserts that the provided `field` is `aria-invalid`, and that it has the expected error `message` */
async function expectErrorFor(field: Locator, message: string): Promise<void> {
  await expect(field).toHaveAttribute("aria-invalid", String(true));
  await expect(field).toHaveAccessibleDescription(message);
}

/** Asserts that the provided `field` is **_not_** `aria-invalid`, and that it has no error message(s) */
async function expectValidField(field: Locator): Promise<void> {
  await expect(field).not.toHaveAttribute("aria-invalid", String(true));
  await expect(field).toHaveAccessibleDescription("");
}

/* ---------------------------------------- Tests ---------------------------------------- */
const testOptions: Array<[string, Parameters<typeof it.use>[0]]> = [
  ["JS Disabled", { javaScriptEnabled: false }],
  ["JS Enabled", { javaScriptEnabled: true }],
];

for (const [label, options] of testOptions) {
  it.describe(`Authenticated Application (${label})`, () => {
    it.describe.configure({ mode: "serial" });
    it.use(options);

    /* -------------------- Setup / Constants -------------------- */
    /** The amount of time after which an access token expires (in `milliseconds`). 2000ms (with a buffer). */
    const accessTokenExpiration = 2 * 1000 * 1.5;

    /** The amount of time after which a refresh token expires (in `milliseconds`). 6000ms (with a buffer). */
    const refreshTokenExpiration = accessTokenExpiration * 3 * 1.2;

    /* -------------------- Tests -------------------- */
    it.describe("Unauthenticated User Management", () => {
      it("Allows unauthenticated users to visit public pages (like the Home Page)", async ({ page }) => {
        await page.goto(paths.home);
        await expect(page.getByText("Hello! This page is publicly accessible to anyone and everyone!")).toBeVisible();
      });

      it("Redirects unauthenticated users to the Login Page when they visit a secure route", async ({ page }) => {
        await page.goto(paths.private);
        await page.waitForURL((url) => url.pathname === paths.login);
        await expect(page.getByRole("heading", { name: /sign in/i, level: 1 })).toBeVisible();
      });
    });

    it.describe("User Signup", () => {
      it("Allows users to signup with an email and password", async ({ page, context }) => {
        await visitSignUpPage(page);
        const email = faker.internet.email();
        const password = "12345678a";

        // Sign up
        await page.getByRole("textbox", { name: /email/i }).fill(email);
        await page.getByRole("textbox", { name: /password/i }).fill(password);
        await page.getByRole("button", { name: /sign up/i }).click();

        // Verify existence of access + refresh token
        await page.waitForURL(paths.home);
        const tokens = await getAuthTokens(context, false);
        expect(tokens.accessToken).toEqual(expect.anything());
        expect(tokens.refreshToken).toEqual(expect.anything());

        // Verify access to secure pages
        await page.goto(paths.private);
        await expect(page.getByText("Hello! This page is private!")).toBeVisible();
      });

      it("Requires users to signup with a valid email and a secure password", async ({
        page,
        context,
        javaScriptEnabled,
      }) => {
        await visitSignUpPage(page);
        const email = faker.internet.email();
        const password = "1234567a";

        /* ---------- Empty fields are forbidden ---------- */
        const emailField = page.getByRole("textbox", { name: /email/i });
        const passwordField = page.getByRole("textbox", { name: /password/i });
        const submitter = page.getByRole("button", { name: /sign up/i });

        await submitter.click();
        if (javaScriptEnabled) {
          await expectErrorFor(emailField, "Email is required");
          await expectErrorFor(passwordField, "Password is required");
        } else {
          await expect(emailField).toHaveJSProperty("validationMessage", "Please fill out this field.");
          await expect(passwordField).toHaveJSProperty("validationMessage", "Please fill out this field.");
        }

        /* ---------- Insecure passwords are forbidden ---------- */
        const securityError = "Password must contain at least 8 characters, including a number";

        // No letters (bad)
        await passwordField.fill("1".repeat(8));
        await submitter.click();
        if (javaScriptEnabled) await expectErrorFor(passwordField, securityError);
        else await expect(passwordField).toHaveJSProperty("validationMessage", "Please match the requested format.");

        // No numbers (bad)
        await passwordField.fill("a".repeat(8));
        await submitter.click();
        if (javaScriptEnabled) await expectErrorFor(passwordField, securityError);
        else await expect(passwordField).toHaveJSProperty("validationMessage", "Please match the requested format.");

        // Too short (bad)
        await passwordField.fill(`${"1".repeat(4)}${"a".repeat(3)}`);
        await submitter.click();
        if (javaScriptEnabled) await expectErrorFor(passwordField, securityError);
        else await expect(passwordField).toHaveJSProperty("validationMessage", "Please match the requested format.");

        // Secure Password (good)
        await passwordField.fill(password);
        await submitter.click();
        if (javaScriptEnabled) await expectValidField(passwordField);
        else await expect(passwordField).toHaveJSProperty("validity.valid", true);

        /* ---------- Invalid emails are forbidden ---------- */
        await emailField.fill("onion");
        await submitter.click();
        if (javaScriptEnabled) await expectErrorFor(emailField, "Email is invalid");
        else {
          await expect(emailField).toHaveJSProperty(
            "validationMessage",
            "Please include an '@' in the email address. 'onion' is missing an '@'.",
          );
        }

        await emailField.fill("onion@tasty.");
        await submitter.click();
        if (javaScriptEnabled) await expectErrorFor(emailField, "Email is invalid");
        else {
          await expect(emailField).toHaveJSProperty(
            "validationMessage",
            "'.' is used at a wrong position in 'tasty.'.",
          );
        }

        // Valid Email
        await passwordField.fill(""); // Note: This is done to verify that the `email`'s error messages get cleared

        await emailField.fill(email);
        await submitter.click();
        if (javaScriptEnabled) await expectValidField(emailField);
        else await expect(emailField).toHaveJSProperty("validity.valid", true);

        /* ---------- Valid email with a secure password ---------- */
        await passwordField.fill(password);
        await submitter.click();

        // Verify existence of access + refresh token
        await page.waitForURL(paths.home);
        const tokens = await getAuthTokens(context, false);
        expect(tokens.accessToken).toEqual(expect.anything());
        expect(tokens.refreshToken).toEqual(expect.anything());
      });

      it("Requires the provided email not to be associated with an existing account", async ({
        page,
        existingAccount,
      }) => {
        await visitSignUpPage(page);

        // Attempt to sign up with an existing account
        const email = page.getByRole("textbox", { name: /email/i });
        await email.fill(existingAccount.email);
        await page.getByRole("textbox", { name: /password/i }).fill(existingAccount.password);
        await page.getByRole("button", { name: /sign up/i }).click();
        await expectErrorFor(email, "This email already exists. Please sign in instead.");
      });
    });

    it.describe("User Logout", () => {
      it('Logs out the user when they click the `Logout` "button" (link)', async ({
        page,
        context,
        existingAccount,
      }) => {
        // Login
        await page.goto(paths.login);
        await page.getByRole("textbox", { name: /email/i }).fill(existingAccount.email);
        await page.getByRole("textbox", { name: /password/i }).fill(existingAccount.password);
        await page.getByRole("button", { name: /sign in/i }).click();
        await page.waitForURL(paths.home);

        // Verify existence of access + refresh token
        const originalTokens = await getAuthTokens(context, false);
        expect(originalTokens.accessToken).toEqual(expect.anything());
        expect(originalTokens.refreshToken).toEqual(expect.anything());

        // Logout
        await page.getByRole("link", { name: /logout/i }).click();
        await expect(page).toHaveURL(paths.login);
        await expect(page.getByRole("heading", { level: 1, name: /sign in/i })).toBeVisible();

        // Verify absence of access token
        const newTokens = await getAuthTokens(context, false);
        expect(newTokens.accessToken).toBe(undefined);
        expect(newTokens.refreshToken).toBe(undefined);
      });

      // NOTE: Testing this use case requires using a REVOKED, EXPIRED Access Token with a VALID Refresh Token.
      // (If revoked access tokens are IMMEDIATELY blacklisted, you shouldn't need to wait for access token expiration.)
      it("Forbids the use of access tokens that have been nullified by a User Logout", async ({
        page,
        context,
        existingAccount,
      }) => {
        // Login
        await page.goto(paths.login);
        await page.getByRole("textbox", { name: /email/i }).fill(existingAccount.email);
        await page.getByRole("textbox", { name: /password/i }).fill(existingAccount.password);
        await page.getByRole("button", { name: /sign in/i }).click();
        await page.waitForURL(paths.home);

        // Grab access + refresh tokens
        const tokens = await getAuthTokens(context);

        // Logout
        await page.getByRole("link", { name: /logout/i }).click();
        await expect(page).toHaveURL(paths.login);
        await expectUserToBeUnauthenticated(context);

        // Reapply revoked access token AND wait for expiration
        await context.addCookies(Object.values(tokens));

        const waitTime = accessTokenExpiration;
        expect(waitTime).toBeLessThan(refreshTokenExpiration);
        await page.waitForTimeout(waitTime);

        // Attempt to visit a secure route
        await page.goto(paths.private);
        await page.waitForURL((url) => url.pathname === paths.login);
        await expect(page.getByRole("heading", { level: 1, name: /sign in/i })).toBeVisible();
      });
    });

    it.describe("User Signin", () => {
      it("Enables users with an existing account to login, redirecting them to the home page", async ({
        page,
        context,
        existingAccount,
      }) => {
        // Login immediately
        await page.goto(paths.login);
        await page.getByRole("textbox", { name: /email/i }).fill(existingAccount.email);
        await page.getByRole("textbox", { name: /password/i }).fill(existingAccount.password);
        await page.getByRole("button", { name: /sign in/i }).click();

        // User should be returned to Home Page
        await expect(page).toHaveURL(paths.home);

        // User should be authenticated
        const tokens = await getAuthTokens(context, false);
        expect(tokens.accessToken).toEqual(expect.anything());
        expect(tokens.refreshToken).toEqual(expect.anything());
      });

      it("Returns users to the page they were trying to visit after authentication", async ({
        page,
        context,
        existingAccount,
      }) => {
        // Unauthenticated user is redirected to auth page
        const originalPath = paths.private;
        await page.goto(originalPath);
        await page.waitForURL((url) => url.pathname === paths.login);
        await expect(page.getByRole("heading", { name: /sign in/i, level: 1 })).toBeVisible();

        // Login immediately
        await page.getByRole("textbox", { name: /email/i }).fill(existingAccount.email);
        await page.getByRole("textbox", { name: /password/i }).fill(existingAccount.password);
        await page.getByRole("button", { name: /sign in/i }).click();

        // User should be returned to ORIGINAL path, NOT the Home Page
        await expect(page).toHaveURL(originalPath);

        // User should be authenticated
        const tokens = await getAuthTokens(context, false);
        expect(tokens.accessToken).toEqual(expect.anything());
        expect(tokens.refreshToken).toEqual(expect.anything());
      });

      it("Rejects invalid email-password combinations", async ({ page, context, existingAccount }) => {
        await page.goto(paths.login);
        const email = page.getByRole("textbox", { name: /email/i });
        const password = page.getByRole("textbox", { name: /password/i });
        const submitter = page.getByRole("button", { name: /sign in/i });

        // An unrecognized email is rejected
        await email.fill(faker.internet.email());
        await password.fill(existingAccount.password);
        await submitter.click();

        const error = page.getByRole("alert").and(page.getByText("Incorrect email and password combination"));
        await expect(error).toBeVisible();

        // A recognized email with an unrecognized password is rejected
        await email.fill(existingAccount.email);
        await password.fill(faker.internet.password());
        await submitter.click();
        await expect(error).toBeVisible();

        // A valid email-password combination is accepted
        await email.fill(existingAccount.email);
        await password.fill(existingAccount.password);
        await submitter.click();
        await expect(error).not.toBeVisible();

        // User is authenticated and redirected to home page with access to secure routes (like the Private Page)
        const tokens = await getAuthTokens(context, false);
        expect(tokens.accessToken).toEqual(expect.anything());
        expect(tokens.refreshToken).toEqual(expect.anything());

        await expect(page).toHaveURL(paths.home);
        await expect(page.getByRole("link", { name: /private/i })).toBeVisible();
      });
    });

    it.describe("Authenticated User Management", () => {
      it("Allows authenticated users to interact with secure routes (like the Private Page)", async ({
        pageWithUser,
      }) => {
        // Visit Private Page AND submit Form
        const text = "This is some cool text";
        await pageWithUser.goto(paths.private);
        await pageWithUser.getByRole("textbox", { name: /text input/i }).fill(text);
        await pageWithUser.getByRole("button", { name: /submit/i }).click();

        // Verify that we got a response back from our form submission
        await expect(pageWithUser.getByText(JSON.stringify({ text }, null, 2))).toBeVisible();
      });

      it("Prevents authenticated users from visiting the Login Page (because they're already logged in)", async ({
        pageWithUser,
      }) => {
        // Attempt to revisit Login Page
        await pageWithUser.goto(paths.login);
        await expect(pageWithUser).toHaveURL(paths.home);
      });

      it("Prevents authenticated users from visiting the Password Reset Page (because they're already logged in)", async ({
        pageWithUser,
      }) => {
        // Attempt to visit Password Reset Page
        await pageWithUser.goto(paths.passwordReset);
        await expect(pageWithUser).toHaveURL(paths.home);
      });
    });

    it.describe("Session Refreshing", () => {
      it("Redirects unauthenticated users to the Login Page", async ({ page }) => {
        await page.goto(paths.refresh);
        await page.waitForURL((url) => url.pathname === paths.login);
        await expect(page.getByRole("heading", { level: 1, name: /sign in/i })).toBeVisible();
      });

      const ProvidesNewTokensWhen = "Gives the user new Auth Tokens when they visit the Session Refresh Route";
      it(`${ProvidesNewTokensWhen} with Valid Access + Valid Refresh Tokens`, async ({ pageWithUser, context }) => {
        // Attempt token refresh
        const originalTokens = await getAuthTokens(context);
        await pageWithUser.goto(paths.refresh);
        await expect(pageWithUser).toHaveURL(paths.home);

        // Tokens should be different
        const newTokens = await getAuthTokens(context);
        expect(newTokens.accessToken).not.toStrictEqual(originalTokens.accessToken);
        expect(newTokens.refreshToken).not.toStrictEqual(originalTokens.refreshToken);

        // User should still be authenticated
        await pageWithUser.goto(paths.private);
        await expect(pageWithUser.getByText("Hello! This page is private!")).toBeVisible();
      });

      it(`${ProvidesNewTokensWhen} with Expired Access + Valid Refresh Tokens`, async ({ pageWithUser, context }) => {
        // Expire access token (but NOT refresh token)
        const originalTokens = await getAuthTokens(context);
        await pageWithUser.waitForTimeout(accessTokenExpiration);

        // Attempt token refresh
        await pageWithUser.goto(paths.refresh);
        await expect(pageWithUser).toHaveURL(paths.home);

        // Tokens should be different
        const newTokens = await getAuthTokens(context);
        expect(newTokens.accessToken).not.toStrictEqual(originalTokens.accessToken);
        expect(newTokens.refreshToken).not.toStrictEqual(originalTokens.refreshToken);

        // User should still be authenticated
        await pageWithUser.goto(paths.private);
        await expect(pageWithUser.getByText("Hello! This page is private!")).toBeVisible();
      });

      const RemovesAuthTokensWhen = "Removes the user's Auth Tokens when they visit the Session Refresh Route";
      it(`${RemovesAuthTokensWhen} without an Access Token`, async ({ pageWithUser, context }) => {
        // Attempt token refresh
        const tokens = await getAuthTokens(context);
        await context.clearCookies({ name: tokens.accessToken.name });
        await pageWithUser.goto(paths.refresh);

        // Tokens should be deleted
        await pageWithUser.waitForURL((url) => url.pathname === paths.login);
        await expectUserToBeUnauthenticated(context);
      });

      it(`${RemovesAuthTokensWhen} with an invalid Access Token`, async ({ pageWithUser, context }) => {
        // Attempt token refresh
        const tokens = await getAuthTokens(context);
        await context.clearCookies({ name: tokens.accessToken.name });
        await context.addCookies([{ ...tokens.accessToken, value: "MUDA_MUDA" }]);
        await pageWithUser.goto(paths.refresh);

        // Tokens should be deleted
        await pageWithUser.waitForURL((url) => url.pathname === paths.login);
        await expectUserToBeUnauthenticated(context);
      });

      it(`${RemovesAuthTokensWhen} with Valid Access + Missing Refresh Tokens`, async ({ pageWithUser, context }) => {
        // Attempt token refresh
        const originalTokens = await getAuthTokens(context);
        await context.clearCookies({ name: originalTokens.refreshToken.name });
        await pageWithUser.goto(paths.refresh);

        // Tokens should be deleted
        await expect(pageWithUser).toHaveURL(paths.login);
        await expectUserToBeUnauthenticated(context);
      });

      it(`${RemovesAuthTokensWhen} with Valid Access + Invalid Refresh Tokens`, async ({ pageWithUser, context }) => {
        // Attempt token refresh
        const originalTokens = await getAuthTokens(context);
        await context.clearCookies({ name: originalTokens.refreshToken.name });
        await context.addCookies([{ ...originalTokens.refreshToken, value: "ORA_ORA_ORA" }]);
        await pageWithUser.goto(paths.refresh);

        // Tokens should be deleted
        await expect(pageWithUser).toHaveURL(paths.login);
        await expectUserToBeUnauthenticated(context);
      });

      it(`${RemovesAuthTokensWhen} with Expired Access + Expired Refresh Tokens`, async ({ pageWithUser, context }) => {
        // Expire BOTH access token AND refresh token. Then attempt token refresh.
        await pageWithUser.waitForTimeout(refreshTokenExpiration);
        await pageWithUser.goto(paths.refresh);

        // Tokens should be deleted
        await expect(pageWithUser).toHaveURL(paths.login);
        await expectUserToBeUnauthenticated(context);
      });

      it(`${RemovesAuthTokensWhen} with Valid Access + Stolen Refresh Tokens`, async ({ pageWithUser, context }) => {
        // Attempt token refresh
        const originalTokens = await getAuthTokens(context);
        await pageWithUser.goto(paths.refresh);

        // Tokens should be different
        const newTokens = await getAuthTokens(context);
        expect(newTokens.accessToken).not.toStrictEqual(originalTokens.accessToken);
        expect(newTokens.refreshToken).not.toStrictEqual(originalTokens.refreshToken);

        // User should still be authenticated
        await pageWithUser.goto(paths.private);
        await expect(pageWithUser.getByText("Hello! This page is private!")).toBeVisible();

        // Attempt refresh again with PREVIOUSLY-USED refresh token
        expect(originalTokens.refreshToken.name).toBe(newTokens.refreshToken.name);
        await context.clearCookies({ name: newTokens.refreshToken.name });
        await context.addCookies([originalTokens.refreshToken]);
        await pageWithUser.goto(paths.refresh);

        // Tokens should be deleted
        await expect(pageWithUser).toHaveURL(paths.login);
        await expectUserToBeUnauthenticated(context);
      });

      it.describe("Automatic Session Refreshing", () => {
        it("Refreshes the user's session while they interact with secure routes", async ({
          pageWithUser,
          context,
          javaScriptEnabled,
        }) => {
          const router = await pageWithUser.evaluate(() => (document.getElementById("__next") ? "pages" : "app"));

          // Guarantee that we start on the Home Page
          await pageWithUser.goto(paths.home);
          const firstTokens = await getAuthTokens(context);

          // Expire access token (but NOT refresh token). Then visit a secure route.
          await pageWithUser.waitForTimeout(accessTokenExpiration);

          const sessionRefreshed = (r: Response) => {
            const url = new URL(r.url());

            if (router === "pages") {
              if (!javaScriptEnabled) return url.pathname === paths.refresh && r.status() === 307;
              return url.pathname === paths.refresh && r.status() === (r.request().method() === "POST" ? 204 : 307);
            }

            return url.pathname === paths.refresh && r.status() === 307;
          };
          const redirect1 = pageWithUser.waitForResponse(sessionRefreshed);

          await pageWithUser.getByRole("link", { name: "Private" }).click();
          await redirect1;

          // User should have been re-authenticated AND directed to their desired page
          const secondTokens = await getAuthTokens(context);
          expect(secondTokens.accessToken).not.toStrictEqual(firstTokens.accessToken);
          expect(secondTokens.refreshToken).not.toStrictEqual(firstTokens.refreshToken);
          await expect(pageWithUser).toHaveURL(paths.private);

          // Expire ONLY access token again. Then perform a `POST` request (via form submission).
          const text = "This is some test text...";
          await pageWithUser.getByRole("textbox", { name: /text input/i }).fill(text);
          await pageWithUser.waitForTimeout(accessTokenExpiration);

          const submitter = pageWithUser.getByRole("button", { name: /submit/i });
          if (router !== "app" && !javaScriptEnabled) await expect(submitter).toHaveJSProperty("form.method", "post");

          const redirect2 = pageWithUser.waitForResponse(sessionRefreshed);
          await pageWithUser.getByRole("button", { name: /submit/i }).click();
          await redirect2;

          // User should have been re-authenticated, AND their form submission should have succeeded.
          const thirdTokens = await getAuthTokens(context);
          expect(thirdTokens.accessToken).not.toStrictEqual(secondTokens.accessToken);
          expect(thirdTokens.refreshToken).not.toStrictEqual(secondTokens.refreshToken);

          // Verify that we got a response back from our form submission
          await expect(pageWithUser).toHaveURL(paths.private);
          await expect(pageWithUser.getByText(JSON.stringify({ text }, null, 2))).toBeVisible();
        });
      });
    });

    it.describe("Miscellaneous Auth Requirements", () => {
      it("Deletes the user's Auth Tokens if they interact with a secure route without a Valid Access Token", async ({
        pageWithUser,
        context,
        javaScriptEnabled,
      }) => {
        // TODO: Raise an issue regarding Server Actions and 303s
        const router = await pageWithUser.evaluate(() => (document.getElementById("__next") ? "pages" : "app"));
        it.skip(
          router === "app" && javaScriptEnabled,
          "Next.js seems unable to handle 303's returned in response to Server Actions",
        );

        // Attempt to `POST` to a secure route (via a form submission) WITHOUT an Access Token
        await pageWithUser.goto(paths.private);
        await pageWithUser.getByRole("textbox", { name: /text input/i }).fill("Some text...");

        const tokens = await getAuthTokens(context);
        await context.clearCookies({ name: tokens.accessToken.name });
        await pageWithUser.getByRole("button", { name: /submit/i }).click();

        // Tokens should be deleted
        await pageWithUser.waitForURL((url) => url.pathname === paths.login);
        await expectUserToBeUnauthenticated(context);

        // Now attempt to visit a secure route with an Invalid Access Token
        await context.addCookies([{ ...tokens.accessToken, value: "POWER!" }, tokens.refreshToken]);
        await pageWithUser.goto(paths.private);

        // Tokens should be deleted again
        await pageWithUser.waitForURL((url) => url.pathname === paths.login);
        await expectUserToBeUnauthenticated(context);
      });
    });
  });
}
