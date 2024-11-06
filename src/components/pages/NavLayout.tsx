import Link from "next/link";
import { useRouter } from "next/router";
import Header from "@/components/Header";
import { authPages } from "@/lib/utils/constants";

interface NavLayoutProps {
  authenticated: boolean;
  children: React.ReactNode;
}

/**
 * A layout component that adds the navigation menu to a page.
 *
 * (`pages` dir only)
 */
export default function NavLayout({ authenticated, children }: NavLayoutProps) {
  const { basePath } = useRouter();

  return (
    <>
      {!authPages.includes(basePath) && (
        <Header authenticated={authenticated} router="pages">
          <Link href="/pages">Home</Link>
          {authenticated && <Link href="/pages/private">Private</Link>}
        </Header>
      )}

      {children}
    </>
  );
}
