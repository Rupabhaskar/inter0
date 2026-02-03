import Link from "next/link";
import { getAllPosts } from "@/data/blog-posts";
import { siteUrl } from "@/lib/seo";

export const metadata = {
  title: "Blog",
  description:
    "JEE Main, JEE Advanced & AP EAMCET preparation tips, mock test strategies, and exam guidance.",
  openGraph: {
    title: "Blog | RankSprint – JEE & EAMCET Prep Tips",
    description:
      "JEE Main, JEE Advanced & AP EAMCET preparation tips, mock test strategies, and exam guidance.",
    url: `${siteUrl}/blog`,
  },
  alternates: { canonical: `${siteUrl}/blog` },
};

export default function BlogPage() {
  const posts = getAllPosts();
  return (
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
  );
}
