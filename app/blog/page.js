import Link from "next/link";
import { getAllPosts } from "@/data/blog-posts";
import { siteUrl, getBlogListingSchema } from "@/lib/seo";

export const revalidate = 86400; // ISR: revalidate blog list every 24 hours

export const metadata = {
  title: "Blog",
  description:
    "JEE Main, JEE Advanced & AP EAMCET preparation tips, mock test strategies, and exam guidance.",
  keywords: [
    "JEE Main mock test",
    "JEE Advanced mock test",
    "AP EAMCET mock test",
    "JEE preparation tips",
    "EAMCET preparation",
    "inter mock test",
    "RankSprint blog",
    "engineering entrance mock test",
  ],
  openGraph: {
    title: "Blog | RankSprint – JEE & EAMCET Prep Tips",
    description:
      "JEE Main, JEE Advanced & AP EAMCET preparation tips, mock test strategies, and exam guidance.",
    url: `${siteUrl}/blog`,
  },
  alternates: { canonical: `${siteUrl}/blog` },
  robots: { index: true, follow: true },
};

function BlogJsonLd({ posts }) {
  const schema = getBlogListingSchema(posts);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function BlogPage() {
  const posts = getAllPosts();
  return (
    <>
      <BlogJsonLd posts={posts} />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">Blog</h1>
      <p className="text-slate-600 mb-8">
        Preparation tips and strategies for JEE Main, JEE Advanced & AP EAMCET.
      </p>
      <ul className="space-y-6">
        {posts.map(({ slug, title, excerpt, date, readingTime }) => (
          <li key={slug}>
            <article>
              <Link
                href={`/blog/${slug}`}
                className="block p-4 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow transition"
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-1">
                  {title}
                </h2>
                <p className="text-sm text-slate-600 mb-2">{excerpt}</p>
                <span className="text-xs text-slate-500">
                  {date} · {readingTime} read
                </span>
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </div>
    </>
  );
}
