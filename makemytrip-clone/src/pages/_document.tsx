import { Html, Head, Main, NextScript } from "next/document";
import { KEYWORDS } from "@/lib/site";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0f766e" />
        <meta name="keywords" content={KEYWORDS} />
        <meta name="application-name" content="Voyago" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
