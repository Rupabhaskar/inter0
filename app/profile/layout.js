import { siteUrl } from "@/lib/seo";

export const metadata = {
  title: "My Profile",
  description: "Manage your RankSprint profile details and account security settings.",
  alternates: { canonical: `${siteUrl}/profile` },
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

export default function ProfileLayout({ children }) {
  return children;
}
