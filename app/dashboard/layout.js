import { siteUrl } from "@/lib/seo";

export const metadata = {
  title: "Student Dashboard",
  description: "View your test history, scores, and performance analytics on RankSprint.",
  alternates: { canonical: `${siteUrl}/dashboard` },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function DashboardLayout({ children }) {
  return children;
}
