// Primary Imports
import Link from "next/link";
import { Children } from "react";
import type { ReactElement, ComponentProps } from "react";

interface HeaderProps {
  authenticated?: boolean;
  children: (ReactElement<ComponentProps<typeof Link>> | false) | (ReactElement<ComponentProps<typeof Link>> | false)[];
}

function Header({ authenticated, children }: HeaderProps): ReactElement {
  const authAction = authenticated ? "logout" : "login";

  return (
    <header>
      <nav aria-label="Primary Navigation">
        <ul>
          {Children.map(children, (c) => (c && c.type === Link ? <li>{c}</li> : null))}
          <li>
            <Link className="auth-button" href={`/${authAction}`}>
              {authAction}
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}

export default Header;
