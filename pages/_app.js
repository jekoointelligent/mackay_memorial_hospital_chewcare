import "../styles/globals.css";
import Head from "next/head";
import { SITE } from "../lib/siteConfig";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>{SITE.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="description" content={SITE.metaDescription} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
