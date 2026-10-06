import type { GetServerSideProps } from "next";
import { SITE_URL } from "@/lib/site";

const PAGES: { path: string; priority: string; changefreq: string }[] = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/routes", priority: "0.8", changefreq: "daily" },
  { path: "/flight-status", priority: "0.8", changefreq: "hourly" },
  { path: "/info/about", priority: "0.4", changefreq: "monthly" },
  { path: "/info/investors", priority: "0.2", changefreq: "yearly" },
  { path: "/info/careers", priority: "0.2", changefreq: "yearly" },
  { path: "/info/travel-updates", priority: "0.3", changefreq: "monthly" },
  { path: "/info/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/info/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/info/agreement", priority: "0.3", changefreq: "yearly" },
];

/** Served at /sitemap.xml. */
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const today = new Date().toISOString().slice(0, 10);
  const urls = PAGES.map(
    (p) =>
      `  <url>\n    <loc>${SITE_URL}${p.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
  ).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate");
  res.write(xml);
  res.end();
  return { props: {} };
};

export default function Sitemap() {
  return null;
}
