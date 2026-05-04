import { siteUrl } from "@/lib/seo";

const base = siteUrl;
const disallowPaths = [
  "/college/",
  "/superadmin/",
  "/api/",
  "/result",
  "/dashboard",
  "/profile",
  "/login",
];
const sitemapUrls = [`${base}/sitemap.xml`, `${base}/blog/sitemap.xml`];

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: disallowPaths,
      },
    ],
    sitemap: sitemapUrls,
    host: base,
  };
}
