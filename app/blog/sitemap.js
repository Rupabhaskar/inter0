import { siteUrl } from "@/lib/seo";
import { getAllPosts } from "@/data/blog-posts";

const base = () => siteUrl.replace(/\/$/, "");
const now = () => new Date();

function toValidDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? now() : parsed;
}

function getPriority(lastModified) {
  const ageInMs = now().getTime() - lastModified.getTime();
  const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));

  if (ageInDays <= 30) return 0.9;
  if (ageInDays <= 90) return 0.8;
  return 0.7;
}

export default function sitemap() {
  const b = base();
  const posts = getAllPosts()
    .filter(({ slug }) => typeof slug === "string" && slug.trim().length > 0)
    .map((post) => ({ ...post, slug: post.slug.trim(), lastModified: toValidDate(post.date) }))
    .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

  const latestPostDate = posts[0]?.lastModified ?? now();
  const blogListingEntry = {
    url: `${b}/blog`,
    lastModified: latestPostDate,
    changeFrequency: "daily",
    priority: 0.9,
  };

  const postEntries = posts.map(({ slug, lastModified }) => ({
    url: `${b}/blog/${slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: getPriority(lastModified),
  }));

  return [blogListingEntry, ...postEntries];
}
