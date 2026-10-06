import type { GetServerSideProps } from "next";
import { SITE_URL } from "@/lib/site";

/** Served at /robots.txt. Private and one-off pages are kept out of search engines. */
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /profile",
    "Disallow: /book",
    "Disallow: /api/",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate");
  res.write(body);
  res.end();
  return { props: {} };
};

export default function Robots() {
  return null;
}
