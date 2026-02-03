import { siteUrl } from "@/lib/seo";

export default function robots() {
  const base = siteUrl.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/college/", "/superadmin/", "/api/", "/result"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/college/", "/superadmin/", "/api/", "/result"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
