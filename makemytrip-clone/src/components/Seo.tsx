import React from "react";
import Head from "next/head";
import { AUTHOR, DEFAULT_DESCRIPTION, DEFAULT_IMAGE, DEFAULT_TITLE, SITE_NAME, SITE_URL } from "@/lib/site";

type Props = {
  /** Page title without the site name, e.g. "Routes & Destinations". Leave empty on the home page. */
  title?: string;
  description?: string;
  /** Path of this page, e.g. "/routes". Used for the canonical link and sharing cards. */
  path?: string;
  /** Keep private or one-off pages (admin, profile, bookings) out of search results. */
  noindex?: boolean;
  image?: string;
  /** Structured data (schema.org) for this page. */
  jsonLd?: object | object[];
};

/** Title, description, canonical link, Open Graph, Twitter card and structured data for one page. */
const Seo = ({ title, description = DEFAULT_DESCRIPTION, path = "/", noindex = false, image = DEFAULT_IMAGE, jsonLd }: Props) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const url = `${SITE_URL}${path}`;
  const text = description.length > 160 ? description.slice(0, 157) + "..." : description;

  return (
    <Head>
      <title key="title">{fullTitle}</title>
      <meta key="description" name="description" content={text} />
      <meta key="robots" name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
      <link key="canonical" rel="canonical" href={url} />

      <meta key="og:type" property="og:type" content="website" />
      <meta key="og:site_name" property="og:site_name" content={SITE_NAME} />
      <meta key="og:title" property="og:title" content={fullTitle} />
      <meta key="og:description" property="og:description" content={text} />
      <meta key="og:url" property="og:url" content={url} />
      <meta key="og:image" property="og:image" content={image} />
      <meta key="og:locale" property="og:locale" content="en_IN" />

      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:title" name="twitter:title" content={fullTitle} />
      <meta key="twitter:description" name="twitter:description" content={text} />
      <meta key="twitter:image" name="twitter:image" content={image} />
      <meta key="author" name="author" content={AUTHOR} />

      {jsonLd && (
        <script
          key="jsonld"
          type="application/ld+json"
          // JSON-LD must be emitted as raw JSON text
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </Head>
  );
};

export default Seo;
