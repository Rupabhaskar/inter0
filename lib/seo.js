/** Base URL for canonical, sitemap, Open Graph - set in env or default */
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ranksprint.com";

export const defaultMetadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RankSprint | Inter JEE Mock Test & EAMCET Mock Test – Practice Online",
    template: "%s | RankSprint",
  },
  description:
    "RankSprint: Inter JEE mock test and EAMCET mock test platform. JEE Main, JEE Advanced & AP EAMCET online mock tests for inter students. Practice. Perform. Achieve.",
  keywords: [
    "RankSprint",
    "inter JEE mock test",
    "EAMCET mock test",
    "inter jee mock test",
    "eamcet mock test",
    "JEE mock test",
    "AP EAMCET mock test",
    "JEE Main practice",
    "online JEE test",
    "RankSprint mock test",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "RankSprint",
    title: "RankSprint | Inter JEE Mock Test & EAMCET Mock Test",
    description: "Inter JEE mock test and EAMCET mock test on RankSprint. JEE Main, JEE Advanced & AP EAMCET online mock tests for inter students.",
    images: [
      {
        url: "/Ranksprint.png",
        width: 300,
        height: 90,
        alt: "RankSprint - Inter JEE Mock Test & EAMCET Mock Test",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RankSprint | Inter JEE Mock Test & EAMCET Mock Test",
    description: "Inter JEE mock test and EAMCET mock test. JEE Main, JEE Advanced & AP EAMCET online mock tests for inter students.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  verification: {
    // Add when you have them – no change to page content
    // google: "google-site-verification-code",
    // yandex: "yandex-verification-code",
  },
};

/** JSON-LD Organization + WebSite for technical SEO – targets RankSprint, inter JEE mock test, EAMCET mock test */
export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "RankSprint",
    alternateName: "RankSprint Mock Test",
    url: siteUrl,
    logo: `${siteUrl}/Ranksprint.png`,
    description: "RankSprint – Inter JEE mock test and EAMCET mock test platform. JEE Main, JEE Advanced & AP EAMCET online mock tests for inter students.",
    sameAs: [
      // Add your social profiles when available – off-page SEO
      // "https://twitter.com/ranksprint",
      // "https://www.facebook.com/ranksprint",
      // "https://www.linkedin.com/company/ranksprint",
    ],
  };
}

export function getWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "RankSprint",
    alternateName: ["RankSprint Mock Test", "RankSprint Inter JEE Mock Test", "RankSprint EAMCET Mock Test"],
    url: siteUrl,
    description: "RankSprint – Inter JEE mock test and EAMCET mock test. JEE Main, JEE Advanced & AP EAMCET online mock tests for inter students.",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/select-test?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Convert slug to search-friendly keywords (e.g. jee-main-mock-test → jee main mock test) for meta and schema */
export function slugToKeywords(slug) {
  if (!slug || typeof slug !== "string") return "";
  return slug
    .trim()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** JSON-LD Blog + ItemList for /blog – helps search engines discover and rank posts by slug-related queries */
export function getBlogListingSchema(posts) {
  const base = siteUrl.replace(/\/$/, "");
  const itemListElement = (posts || []).map((post, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `${base}/blog/${post.slug}`,
    name: post.title,
    description: post.excerpt,
  }));
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "RankSprint Blog – JEE & EAMCET Prep Tips",
    description: "JEE Main, JEE Advanced & AP EAMCET preparation tips, mock test strategies, and exam guidance.",
    url: `${base}/blog`,
    publisher: {
      "@type": "Organization",
      name: "RankSprint",
      logo: { "@type": "ImageObject", url: `${base}/Ranksprint.png` },
    },
    blogPost: itemListElement.map((item) => ({
      "@type": "BlogPosting",
      url: item.url,
      headline: item.name,
      description: item.description,
    })),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: itemListElement.length,
      itemListElement,
    },
  };
}

/** Image SEO – public images with title/caption for sitemap and schema */
const base = () => siteUrl.replace(/\/$/, "");

export const publicImages = {
  logo: {
    src: "/Ranksprint.png",
    url: () => `${base()}/Ranksprint.png`,
    title: "RankSprint logo – Inter JEE mock test and EAMCET mock test platform",
    caption: "RankSprint – Practice. Perform. Achieve. Online JEE Main, JEE Advanced & AP EAMCET mock tests for inter students.",
    width: 300,
    height: 90,
    alt: "RankSprint logo – Inter JEE mock test and EAMCET mock test platform",
  },
  hero: {
    src: "/hero.jpg",
    url: () => `${base()}/hero.jpg`,
    title: "Inter students taking JEE EAMCET online mock test on RankSprint",
    caption: "RankSprint online mock test for JEE Main, JEE Advanced and AP EAMCET – practice like the real exam.",
    width: 1920,
    height: 1080,
    alt: "Inter students taking JEE and EAMCET online mock test on RankSprint",
  },
  syllabus: {
    src: "/syllabus.jpg",
    url: () => `${base()}/syllabus.jpg`,
    title: "JEE Main JEE Advanced AP EAMCET syllabus – RankSprint",
    caption: "JEE and EAMCET syllabus and exam preparation for inter students on RankSprint.",
    width: 460,
    height: 460,
    alt: "JEE Main JEE Advanced AP EAMCET syllabus – RankSprint exam preparation",
  },
};

/** Sitemap image entries for homepage (used in app/sitemap.js) */
export function getHomePageSitemapImages() {
  return [
    { url: publicImages.logo.url(), title: publicImages.logo.title, caption: publicImages.logo.caption },
    { url: publicImages.hero.url(), title: publicImages.hero.title, caption: publicImages.hero.caption },
  ];
}

/** ImageObject schema for homepage – helps Google index images for image search */
export function getHomeImageSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: "RankSprint – Inter JEE mock test and EAMCET mock test",
    description: "RankSprint platform images: logo and hero for JEE Main, JEE Advanced and AP EAMCET online mock tests.",
    image: [
      {
        "@type": "ImageObject",
        url: publicImages.logo.url(),
        name: publicImages.logo.title,
        description: publicImages.logo.caption,
        width: publicImages.logo.width,
        height: publicImages.logo.height,
      },
      {
        "@type": "ImageObject",
        url: publicImages.hero.url(),
        name: publicImages.hero.title,
        description: publicImages.hero.caption,
        width: publicImages.hero.width,
        height: publicImages.hero.height,
      },
    ],
  };
}
