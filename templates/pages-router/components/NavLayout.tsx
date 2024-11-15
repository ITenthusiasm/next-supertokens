import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Header from "@/components/Header";
import { authPages, commonRoutes } from "@/lib/utils/constants";

interface NavLayoutProps {
  authenticated: boolean;
  children: React.ReactNode;
}

/** A layout component that adds the navigation menu to a page. */
export default function NavLayout({ authenticated, children }: NavLayoutProps) {
  const router = useRouter();

  // Override Next's attempts at redirecting to `/auth/session/refresh` during client-side navigation
  useEffect(() => {
    router.events.on("routeChangeStart", handleRouteChangeStart);
    return () => router.events.off("routeChangeStart", handleRouteChangeStart);

    async function handleRouteChangeStart(url: string, _data: { shallow: boolean }) {
      if (url.startsWith(commonRoutes.refreshSession)) window.location.assign(url);
    }
  }, [router]);

  return (
    <>
      {!authPages.includes(router.basePath) && (
        <Header authenticated={authenticated}>
          <Link href="/">Home</Link>
          {authenticated && <Link href="/private">Private</Link>}
        </Header>
      )}

      {children}
    </>
  );
}
