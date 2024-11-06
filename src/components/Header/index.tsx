// Primary Imports
import Link from "next/link";
import { Children } from "react";
import type { ReactElement, ComponentProps } from "react";

// Styles
import "./Header.scss";

interface HeaderProps {
  authenticated?: boolean;
  /** The Next.js Router being used. Determines the URL of the `login`/`logout` buttons. */
  router: "app" | "pages";
  children: (ReactElement<ComponentProps<typeof Link>> | false) | (ReactElement<ComponentProps<typeof Link>> | false)[];
}

function Header({ authenticated, router, children }: HeaderProps): ReactElement {
  const authAction = authenticated ? "logout" : "login";

  return (
    <header>
      <nav aria-label="Primary Navigation">
        <ul>
          {Children.map(children, (c) => (c && c.type === Link ? <li>{c}</li> : null))}
          <li>
            <Link className="auth-button" href={`/${router === "pages" ? "pages/" : ""}${authAction}`}>
              {authAction}
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}

export default Header;
