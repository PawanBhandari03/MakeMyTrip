import { Html, Head, Main, NextScript } from "next/document";
import { KEYWORDS } from "@/lib/site";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
        <meta name="theme-color" content="#dc2626" />
        <meta name="keywords" content={KEYWORDS} />
        <meta name="application-name" content="MakeMyTrip Clone" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
