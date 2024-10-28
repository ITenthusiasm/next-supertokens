import SuperTokens from "supertokens-node";
import Session from "supertokens-node/recipe/session";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import Passwordless from "supertokens-node/recipe/passwordless";
import ThirdParty from "supertokens-node/recipe/thirdparty";

SuperTokens.init({
  supertokens: {
    connectionURI: process.env.SUPERTOKENS_CONNECTION_URI as string,
    apiKey: process.env.SUPERTOKENS_API_KEY as string,
  },
  appInfo: {
    appName: "Testing Next.js with Custom Backend",
    websiteDomain: process.env.SUPERTOKENS_WEBSITE_DOMAIN as string,
    apiDomain: process.env.SUPERTOKENS_API_DOMAIN as string,
    apiBasePath: process.env.SUPERTOKENS_API_BASE_PATH as string,
  },
  recipeList: [
    // Initializes passwordless features
    Passwordless.init({ contactMethod: "EMAIL_OR_PHONE", flowType: "USER_INPUT_CODE_AND_MAGIC_LINK" }),

    EmailPassword.init(), // Initializes signin / signup features
    Session.init(), // Initializes session features

    // Initializes ThirdParty auth features
    ThirdParty.init({
      signInAndUpFeature: {
        providers: [
          // Built-in Providers
          {
            config: {
              thirdPartyId: "github",
              requireEmail: true,
              clients: [
                {
                  clientId: process.env.GITHUB_OAUTH_CLIENT_ID as string,
                  clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
                  scope: ["user:email"],
                },
              ],
            },
          },
          // Custom Providers
          {
            config: {
              thirdPartyId: "planningcenter",
              requireEmail: true,
              authorizationEndpoint: "https://api.planningcenteronline.com/oauth/authorize",
              tokenEndpoint: "https://api.planningcenteronline.com/oauth/token",
              userInfoEndpoint: "https://api.planningcenteronline.com/people/v2/me/emails?where[primary]=true",
              userInfoMap: {
                fromUserInfoAPI: {
                  userId: "data.0.relationships.person.data.id",
                  email: "data.0.attributes.address",
                  emailVerified: "data.0.attributes.primary", // Weak, but the best thing that we can work with
                },
                // See: https://github.com/supertokens/supertokens-node/issues/954
                fromIdTokenPayload: {
                  userId: undefined,
                  email: undefined,
                  emailVerified: undefined,
                },
              },
              clients: [
                {
                  clientId: process.env.PLANNING_CENTER_OAUTH_CLIENT_ID as string,
                  clientSecret: process.env.PLANNING_CENTER_OAUTH_CLIENT_SECRET,
                  scope: ["people"],
                },
              ],
            },
          },
        ],
      },
    }),
  ],
});
