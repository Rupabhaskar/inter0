import { siteUrl, getHomePageSitemapImages } from "@/lib/seo";

const base = () => siteUrl;
const generatedAt = new Date();

/** Public static routes – only indexable pages */
const staticRoutes = [
  { path: "", changeFrequency: "weekly", priority: 1, images: true },
  { path: "/select-test", changeFrequency: "weekly", priority: 0.9 },
];

function normalizePath(path) {
  if (!path || path === "/") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export default function sitemap() {
  const b = base();

  const homeImages = getHomePageSitemapImages();
  const homeImageUrls = homeImages.map((img) => img.url);
  const staticEntries = staticRoutes
    .map(({ path, changeFrequency, priority, images }) => {
      const normalizedPath = normalizePath(path);
      return {
        url: `${b}${normalizedPath}`,
        lastModified: generatedAt,
        changeFrequency,
        priority,
        ...(images && normalizedPath === "/" && homeImageUrls.length > 0
          ? { images: homeImageUrls }
          : {}),
      };
    })
    .filter((entry, index, arr) => arr.findIndex((item) => item.url === entry.url) === index);

  return staticEntries;
}
