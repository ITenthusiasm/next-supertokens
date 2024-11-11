import { getGlobalServerData } from "@/lib/server/app/requestHelpers";
import ClientRootLayout from "./layout-client";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getGlobalServerData();
  const authenticated = Boolean(user?.id);

  return (
    <html lang="en">
      <body>
        <ClientRootLayout authenticated={authenticated}>{children}</ClientRootLayout>
      </body>
    </html>
  );
}

export const metadata = {
  title: "Next SuperTokens",
  description: "Example of how to use Next with SuperTokens",
};
