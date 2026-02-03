import { siteUrl, getHomePageSitemapImages } from "@/lib/seo";

const base = () => siteUrl.replace(/\/$/, "");

/** Public static routes – only indexable pages (no /college, /superadmin, /api, /result per robots) */
const staticRoutes = [
  { path: "", changeFrequency: "weekly", priority: 1, images: true },
  { path: "/blog", changeFrequency: "daily", priority: 0.9 },
  { path: "/select-test", changeFrequency: "weekly", priority: 0.9 },
  { path: "/login", changeFrequency: "monthly", priority: 0.6 },
  { path: "/dashboard", changeFrequency: "monthly", priority: 0.7 },
  { path: "/profile", changeFrequency: "monthly", priority: 0.6 },
];

/** Blog entries with real lastModified from post date for better SEO */
async function getBlogEntries() {
  const { getAllPosts } = await import("@/data/blog-posts");
  const posts = getAllPosts();
  const b = base();
  return posts.map(({ slug, date }) => ({
    url: `${b}/blog/${slug}`,
    lastModified: new Date(date),
    changeFrequency: "monthly",
    priority: 0.8,
  }));
}

export default async function sitemap() {
  const b = base();

  const homeImages = getHomePageSitemapImages();
  const homeImageUrls = homeImages.map((img) => img.url);
  const staticEntries = staticRoutes.map(({ path, changeFrequency, priority, images }) => ({
    url: `${b}${path || "/"}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
    ...(images && path === "" && homeImageUrls.length > 0 ? { images: homeImageUrls } : {}),
  }));

  const blogEntries = await getBlogEntries();

  return [...staticEntries, ...blogEntries];
}
