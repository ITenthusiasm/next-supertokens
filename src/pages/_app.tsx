import type { AppProps } from "next/app";
import "@/app/global.scss";

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
