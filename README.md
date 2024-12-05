# Next.js SuperTokens

Hello! This is my attempt at providing an example of how to use [`Next.js`](https://nextjs.org/) (a tool for building SSR web applications in React, like [`Remix`](https://remix.run/)) with [`SuperTokens`](https://supertokens.com/) (an open source alternative to user authentication). Note that this repository uses the `EmailPassword`/`Passwordless`/`ThirdParty` recipes/approaches from `SuperTokens` for its examples. However, the code here should be easily transferrable to the other authentication repices/methods that `SuperTokens` provides.

The solution here is based on my work done in the [Remix](https://github.com/ITenthusiasm/remix-supertokens) and [SvelteKit](https://github.com/ITenthusiasm/svelte-kit-supertokens) versions of this app, but it has been modified to be more accustomed to Next.js. Note that this application takes an SSR-only approach for three reasons: 1&rpar; Better security (big plus), 2&rpar; Guaranteed [progressive enhancement](https://remix.run/docs/main/discussion/progressive-enhancement) (also a big plus), and 3&rpar; Easier code management (arguably).

If there are any questions, concerns, or ideas for improvement, feel free to reach out to me in the [SuperTokens Discord](https://supertokens.com/discord). If you notice any problems with the example application, feel free to open an issue here on GitHub.

## How to Run the App

Start the dev server by running `npm run dev`. **Remember to add your own `.env` file to configure SuperTokens!** You will need to configure:

- `ROUTER` (e.g., `pages` or `app`)
- `DOMAIN` (e.g., `http://localhost:5173`)
- `SUPERTOKENS_CONNECTION_URI` (e.g., `https://try.supertokens.com`)
- `SUPERTOKENS_API_KEY` (optional if your `SUPERTOKENS_CONNECTION_URI` is `https://try.supertokens.com`)
- `SUPERTOKENS_WEBSITE_DOMAIN` (e.g., `http://localhost:5173`)
- `SUPERTOKENS_API_DOMAIN` (e.g., `http://localhost:5173`)
- `SUPERTOKENS_API_BASE_PATH` (e.g., `/auth`)

Note that you will need to configure additional environment variables for testing the `ThirdParty` login feature. (See the usage of `SuperTokens.init()` in this project.)

### Choosing the Router for Next.js

Next.js provides two different kinds of filesystem routers: The [App Router](https://nextjs.org/docs/app/building-your-application/routing) and the [Pages Router](https://nextjs.org/docs/pages/building-your-application/routing). This project provides examples for _both_ routers in the [`templates`](./templates/) folder, which is located at the root of this project.

**_You must indicate the type of router that you want to use when you run the example application_**. You can do this by setting the `ROUTER` environment variable in your `.env` file, or by specifying the environment variable when starting the dev server (e.g., `ROUTER=pages npm run dev`).

When the dev server is started (`npm run dev`) or the application is built (`npm run build`), a `src` folder will be generated from one of the provided [`templates`](./templates/) based on the configured `ROUTER` environment variable. This `src` folder is the one that will be used for running/building the application.

If you want to make temporary changes to the application code, you can make them in the generated `src` folder. (These changes will be lost the next time you run the dev server or build the application.) To make more permanent changes to the application code, you should update the code in the `templates` folder. After you're done applying these changes, you will need to re-run/re-build the app.

### Using Other Authentication Methods

By default, the application uses the `EmailPassword` recipe provided by SuperTokens for logging in. If you click the `Login` button, you will be directed to the `EmailPassword` login page (`/login`). If you logout, you will be redirected to that page. If you lack valid credentials and attempt to visit a protected route, you will again be redirected to that page.

To authenticate using the _`Passwordless`_ recipe provided by SuperTokens, you will need to navigate to `/passwordless/login` instead of `/login`. Once you login from the `Passwordless` page, the rest of the user experience behaves the same (e.g., visiting protected routes, refreshing your auth session, logging out, etc.). If you prefer `Passwordless` authentication, feel free to change all of the links/redirects from `/login` to `/passwordless/login`. (I know that sounds tedious. In the future, I might create an ENV var that lets you toggle this behavior instead.)

Similar to above, you will need to visit `/thirdparty/login` to authenticate using the _`ThirdParty`_ recipe provided by SuperTokens. Below are some links that can help you get started with different OAuth Providers.

- [SuperTokens Custom Provider Docs](https://supertokens.com/docs/thirdpartypasswordless/common-customizations/signup-form/custom-providers#via-oauth-endpoints)
- [GitHub](https://github.com/)
  - https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
  - https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app
  - https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps
  - https://github.com/logos
- [Planning Center](https://www.planningcenter.com/)
  - https://developer.planning.center/docs/#/overview/
  - https://developer.planning.center/docs/#/overview/authentication
  - https://developer.planning.center/docs/#/apps/people/2024-09-12/vertices/email
  - https://www.planningcenter.com/logos

**_Be careful to adhere to the guidelines of your OAuth Providers if you are using their logos on your site._**

If you have specific questions about how the `Passwordless` recipe works, you might be helped by visiting the [Q&A exchange](https://discord.com/channels/603466164219281420/1282820138151968768/1282820138151968768) between some of the developers. For questions about the `ThirdParty` recipe, visit the discussion [here](https://discord.com/channels/603466164219281420/1291145637257150497/1291145637257150497).

### What Code Do I Actually _Need_?

- If you're using the `EmailPassword` recipe, then you _don't_ need the `passwordless/login/` page or the `thirdparty/login/` page (or their dependencies).
- If you're using the `Passwordless` recipe, then you _don't_ need the `login/`, `reset-password/`, and `thirdparty/login/` pages (or their dependencies).
- If you're using the `ThirdParty` recipe, then you _don't_ need the `login/`, `reset-password/`, and `passwordless/login/` pages (or their dependencies).

Obviously, you can decide how much you care about the (S)CSS files. Beyond that, the rest of the code in the codebase should always be relevant for you. The (very few) parts that aren't should be obvious.

## Gotchas

### 1&rpar; Account Linking

Account Linking is **_not_** supported by this example project (yet). Consequently, if you login to the application with 2 different methods (e.g., `Passwordless` and `ThirdParty`) which both use the **_same_** User Email, then [you should expect 2 **_separate_** accounts to be created](https://discord.com/channels/603466164219281420/1294322847170166896/1294322847170166896). **_These accounts will not be merged._** Ideally, most users of your application will only use one method for authentication; so this shouldn't be a significant problem.

If the idea of creating 2 separate accounts with the same email concerns you, then you can require your users to use only one login method. To help you accomplish this, you can use `SuperTokens.listUsersByAccountInfo` to check for existing accounts related to a user. (For example, you can list all accounts having an `email` that you specify.) You can check this account data to ensure that users logging into your application only authenticate with the method which they originally used to sign up. Below is an example of how you could handle this.

<details>
  <summary>Example of Checking the Authentication Method</summary>

```ts
// This function assumes that `EmailPassword`, `Passwordless`, AND `ThirdParty` are all used in the same app.
async function verifyAuthMethod(request: Request): boolean {
  // Note: If you have already read the `FormData`, then you should pass it to this function as a separate argument.
  const formData = await request.formData();
  const { searchParams } = new URL(request.url);

  // For `Passwordless`/`EmailPassword`, you can get the email from your form data.
  // For `ThirdParty`, use `provider.getUserInfo()` to get the email AFTER your user is redirected to your app.
  let email = formData.get("email");

  // Check URL for a Provider ID in case user is coming back from a Provider Redirect (`ThirdParty` only)
  if (!email) {
    const providerId = searchParams.get("provider") ?? "";
    // Note: If necessary, pass a valid `clientType` instead of `undefined`
    const provider = await ThirdParty.getProvider(tenantId, providerId, undefined);

    if (provider) {
      const oAuthTokens = await provider.exchangeAuthCodeForOAuthTokens(/* ... Provide any data needed here ... */);
      const userInfoFromProvider = await provider.getUserInfo({ oAuthTokens });
      email = userInfoFromProvider.email.id;
    }
  }

  // If your application logic is correct, this array should always be length `0` or `1`
  const [user] = await SuperTokens.listUsersByAccountInfo(tenantId, { email });

  // This is an entirely new account. Someone is signing up for the first time.
  if (!user) return true;

  // For `EmailPassword`/`Passwordless`, you can get this from a hidden input in your form.
  // For `ThirdParty`, you need to use something else (like a Query Parameter) when the user is redirected to your app.
  const recipeId = formData.get("recipeId") ?? searchParams.get("recipeId");

  // Again, if your application logic is correct, this array should always be length `0` or `1`
  const [currentLoginMethod] = user.loginMethods;
  return currentLoginMethod.recipeId === recipeId;
}
```

</details>

You can add to (or subtract from) the above logic according to your needs.

Note that Account Linking is a [paid feature](https://supertokens.com/pricing) in SuperTokens. Consequently, you should expect to be charged if you run tests locally with Account Linking enabled.

### 2&rpar; Quirks/Disadvantages with the Next.js App Router

Although the Next.js App Router is the new and recommended way of building Next apps, it's important to understand that the features of this router are still not fully fleshed out yet. Consequently, there are some strong limitations that you will encounter when you try to use it with SuperTokens. In some cases, the App Router won't work cleanly with SuperTokens at all (unlike other frameworks such as [Remix](https://remix.run/), [SvelteKit](https://svelte.dev/docs/kit/introduction), and even Next's Pages Router).

If you can use another framework, or if you can temporarily lean into the Pages Router for certain authentication needs in SuperTokens, we highly encourage it.

#### A&rpar; Server Actions Reset Forms by Default

Unfortunately, as of 2024-12-04, Next's form-related [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) will always [reset a form's fields](https://www.robinwieruch.de/react-server-action-reset-form/) when it is submitted. This can be a very frustrating experience for users who try to login to your application, and you will notice this behavior on pages like the [Private Page](./templates/app-router/app/private/page-client.tsx). There are two ways to counteract this behavior:

1. Force Server Actions to be triggered manually (e.g., in a `submit` event handler) when client-side JS is available. Although it is somewhat unorthodox, this approach is _also_ required with Next.js if you want your form to be validated on the client-side when it is submitted. (Examples of this approach can be found on the [Login Page](./templates/app-router/app/login/page.tsx), the [Reset Password Page](./templates/app-router/app/reset-password/page.tsx), and the [Passwordless Login Page](./templates/app-router/app/passwordless/login/page-client.tsx).)
2. Have your Server Action return the form data that the user submitted. Then, after Next.js resets your form, populate the form fields with the returned form data. You can learn more about this approach [here](https://www.robinwieruch.de/react-server-action-reset-form/). (Note: If you also need to run client-side validation when your form is submitted, then this approach _will not_ help you.)

#### B&rpar; Partial Support for Passwordless Login, and No Support for ThirdParty Login

This example project shows you how to use the Passwordless and ThirdParty logins that SuperTokens provides with Next's _Pages Router_. However, for the App Router, the ThirdParty Login is not supported; and the Passwordless Login is only supported if you are using the 6-digit code (instead of the Login Link).

The reason that Login Links and ThirdParty Logins are not supported in this project for the App Router is that both methods will issue a `GET` request to the server for user authentication. During this request, the user's access tokens must be set as HTTP cookies (if authentication succeeds). However, [the App Router does not support setting cookies during SSR](https://github.com/vercel/next.js/issues/51875), meaning that cookies cannot be set from within React Sever Components (RSCs). Thus, we can't support Login Links or ThirdParty Logins with the App Router at this time. (It is _technically_ possible to try to complete the authentication using `GET` Route Handlers, but that approach requires writing code which is more complex and which relies on an unhealthy amount of redirects.)

If your project requires you to use the Next.js App Router, we **_strongly_** recommend that you opt-in to the Pages Router for your Passwordless and/or ThirdParty Logins. This will be a very small fraction of your application, so it shouldn't be a significant inconvenience.

**_If you are starting a new SSR React project, we strongly recommend using Remix instead._** At this time, the developer experience in Remix is significantly better -- especially when it comes to using tools like SuperTokens. And the performance is great as well. However, the choice is yours to make. (And of course, if you prefer Next.js, that's fine too.)

## Frequently Asked Questions

### Why Use a Custom UI Instead of the Components Provided by SuperTokens?

There are a few reasons why a custom UI was used in this repository (instead of what SuperTokens provides for React). To give just a few...

1. **The current components that SuperTokens provides require client-side JavaScript**.[^1] _This means that users who disable_ (or for some reason fail to properly download) _the JavaScript necessary for your web app will be unable login_. (It also means a larger JS bundle size and a slower application.) Having a custom solution that doesn't require JavaScript for your application to work will improve user experience. Moreoever, it makes Next.js easier to integrate with.
2. **The current solutions that SuperTokens provides are not very [accessible](https://developer.mozilla.org/en-US/docs/Web/Accessibility) (yet)**. A custom solution allows us to make our forms more accessible while we wait for improvements. Note that I am still making improvements on this repo, myself; so suggestions are welcome. Consult the [MDN docs](https://developer.mozilla.org/) for more a11y info.
3. **By writing out the code from scratch, this repository becomes _far_ more transferrable between JS frameworks** (especially frameworks that SuperTokens does not yet have example components for).
4. **A custom solution is easier to add custom styles to via CSS.**
5. **A custom solution gives you a better idea of what the components provided by SuperTokens do for you** (for those of you who are overly curious like me).

[^1]: Almost certainly, these concerns with the components provided by SuperTokens will be resolved in the future. (Part of the point of this repo is to give potential ideas for improvement.)

### Why Aren't You Using `supertokens-website` or `supertokens-web-js`?

Depending too much on `supertokens-website` or `supertokens-web-js` will result in an application that cannot run without JavaScript. And an application that can't run without JavaScript is actually [inaccessible to a lot of users](https://www.kryogenix.org/code/browser/everyonehasjs.html). Consequently, we've pursued a solution that works _without_ these pacakages and _without_ JavaScript. (Don't worry! We still _enhance_ the app with JS to improve the user's experience whenever possible.) This means that our application will be accessible to the broadest range of users! :smile:

As an added bonus, we decrease our JS bundle size **_significantly_** when we avoid the use of `supertokens-website` and _especially_ `supertokens-web-js`.

### Why Aren't You Using the Middleware from `supertokens-node`?

If you've seen the comments from [@Rich-Harris](https://github.com/Rich-Harris) (creator of Svelte) regarding server middleware (e.g., Express Middleware), then you'll know that solutions which require you to use middleware are often restricted and will prevent you from enhancing your application with other very important features. This is especially true if you're working with an SSR framework. Unfortunately, I have found Rich Harris's statements to be correct while working with my own Next.js application. There are workarounds for these problem cases that allow people to still use middleware... but those aggressive workarounds often end up looking more ugly and complicated. (And thus, such approaches are more prone to error).

Avoiding the `supertokens-node` middleware ended up being _required_ for me to use HTTPS in my application _and_ get it working with high security in Cloudflare. I'll spare you the details, but there are other edge cases like these where `supertokens-node` middleware just won't work (or won't work well). Thankfully, in `supertokens-node@14`, the SuperTokens team was kind enough to introduce functions that allow you to get authentication working _without_ using their custom middleware. If you're using any kind of SSR framework that leverages progressive enhancement ([SvelteKit](https://kit.svelte.dev/), [Remix](https://remix.run/), [SolidStart](https://start.solidjs.com/), [Next.js](https://nextjs.org/) etc.), then you'll want to leverage these functions instead of using the Express Middleware as well.

### Why Are the `getServerSideProps` Functions in the `Pages Router` Handling `POST` Requests?

To support Server Actions!

Unfortunately, the Next.js Pages Router does not ship with _native_ support for features like [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) (unlike the App Router). However, it is possible to support these features by writing our own code. For example: By handling `POST` requests in the `getServerSideProps` functions, we can handle form submissions for users who don't have JavaScript enabled. And by writing a clever `fetch` helper (i.e., the custom [`useFormAction`](./templates/pages-router/lib/utils/hooks.ts) hook), we can progressively enhance the application with an improved UX for form submissions when JS is available.

This technically gives us more flexibility in how our application works -- which is nice. However, it is still slightly inconvenient that we have to support the Server Actions feature ourselves.

### Can I Use Multiple Authentication Methods on the Same Page?

Absolutely! This project puts the different authentication methods on different pages. But that is only done to make the server logic on each individual page smaller. You are more than welcome to combine multiple authentication methods on a single page. For example, you could merge the `EmailPassword` Login Page with the `ThirdParty` Login Page. All you need to do is combine the UI Markup and the Server Logic as needed.

## Security Insights

Although the middleware-free approach gives us many advantages when it comes to using SuperTokens with SSR frameworks, it also gives us a little more responsibility. You'll notice in this app that we have to be intentional about the settings which we use for our HTTP cookies. You don't necessarily need to use the settings in this project (though you _should_ use `HttpOnly` and you _should_ set a strict `Path`), but you should certainly ensure that your settings are the safest that they can be for your application. Here are some resources that may be helpful for you on the matter:

- [How the `Set-Cookie` HTTP Header Works](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [Docs for the `cookie` NPM package](https://www.npmjs.com/package/cookie)

It doesn't currently seem like `Next` provides any significant [CSRF](https://developer.mozilla.org/en-US/docs/Glossary/CSRF) protection out of the box; so if you're interested in addressing the matter _and_ you're willing to stay with `Next` (instead of trying out something else like `SvelteKit`), consider the following resources:

- [Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

SuperTokens does have some anti-CSRF features, but there are cases where it should be used and cases where it need not be used. From [@rishabhpoddar](https://github.com/rishabhpoddar):

> Basically, when you call `createNewSessionWithoutRequestResponse`, and if you get an anti csrf token, then you should pass that in when using `getSessionWithoutRequestResponse`. If you do not get an anti csrf token, you don't need it (based on your `apiDomain` and `websiteDomain` setting) and should check for custom request header before calling `getSessionWithoutRequestResponse`. You should not explicitly set the value of `disableAntiCsrf` when calling createNewSession unless you are not using cookies at all.

Bear in mind that if you're using a framework that (sufficiently) protects against CSRF by default, then you don't necessarily need to worry about the custom headers yourself.

---

I hope you find this useful! Let me know your thoughts here on GitHub or on the [SuperTokens Discord](https://supertokens.com/discord). :&rpar; If there are any ways that I can improve anything here, feel free to say so.

<details>
  <summary>
    <b>Original <code>Next.js</code> README</b>
  </summary>

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

</details>
