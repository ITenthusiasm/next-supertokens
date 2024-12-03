import type { AppProps } from "next/app";
import "@/styles/shared/global.scss";
import "@/styles/shared/auth-form.scss";
import "@/styles/shared/tailwind.css";
import "@/styles/routes/login.scss";
import "@/styles/routes/private.scss";
import "@/components/Header/Header.scss";

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
