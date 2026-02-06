import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getAllSlugs } from "@/data/blog-posts";
import { siteUrl, slugToKeywords } from "@/lib/seo";

export const revalidate = 86400; // ISR: revalidate blog posts every 24 hours

export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post not found" };
  const url = `${siteUrl}/blog/${post.slug}`;
  const keywordsFromSlug = slugToKeywords(post.slug);
  const keywords = [
    post.title,
    ...(keywordsFromSlug ? [keywordsFromSlug] : []),
    "RankSprint",
    "JEE mock test",
    "EAMCET mock test",
  ].filter(Boolean);
  return {
    title: post.title,
    description: post.excerpt,
    keywords: keywords.slice(0, 10),
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      type: "article",
      publishedTime: post.date,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
    alternates: { canonical: url },
    robots: { index: true, follow: true },
  };
}

function BlogPostingJsonLd({ post }) {
  const url = `${siteUrl}/blog/${post.slug}`;
  const keywordsFromSlug = slugToKeywords(post.slug);
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    publisher: {
      "@type": "Organization",
      name: "RankSprint",
      logo: { "@type": "ImageObject", url: `${siteUrl}/Ranksprint.png` },
    },
    ...(keywordsFromSlug ? { keywords: keywordsFromSlug } : {}),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();
  return (
    <>
      <BlogPostingJsonLd post={post} />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link
          href="/blog"
          className="text-sm text-blue-600 hover:underline mb-6 inline-block"
        >
          ← Back to Blog
        </Link>
        <article>
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {post.title}
            </h1>
            <p className="text-sm text-slate-500">
              {post.date} · {post.readingTime} read
            </p>
          </header>
          <div
            className="blog-content text-slate-700 leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      </div>
    </>
  );
}
