import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getAllSlugs } from "@/data/blog-posts";
import { siteUrl } from "@/lib/seo";

export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post not found" };
  const url = `${siteUrl}/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
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
  };
}

function ArticleJsonLd({ post }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    url: `${siteUrl}/blog/${post.slug}`,
    publisher: {
      "@type": "Organization",
      name: "RankSprint",
      logo: { "@type": "ImageObject", url: `${siteUrl}/Ranksprint.png` },
    },
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
      <ArticleJsonLd post={post} />
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
