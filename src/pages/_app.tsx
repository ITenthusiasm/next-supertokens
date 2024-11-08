import type { AppProps } from "next/app";
import "@/styles/shared/global.scss";

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
