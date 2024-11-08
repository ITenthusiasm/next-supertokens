"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import { authPages } from "@/lib/utils/constants";
import "@/styles/shared/global.scss";

interface ClientRootLayoutProps {
  authenticated: boolean;
  children: React.ReactNode;
}

export default function ClientRootLayout({ authenticated, children }: ClientRootLayoutProps) {
  const pathname = usePathname() ?? "";

  return (
    <>
      {!authPages.includes(pathname) && (
        <Header authenticated={authenticated} router="app">
          <Link href="/">Home</Link>
          {authenticated && <Link href="/private">Private</Link>}
        </Header>
      )}

      {children}
    </>
  );
}
