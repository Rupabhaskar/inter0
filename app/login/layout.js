import { siteUrl } from "@/lib/seo";

export const metadata = {
  title: "Student Login",
  description: "Log in to your RankSprint account to access tests, dashboard, and profile.",
  alternates: { canonical: `${siteUrl}/login` },
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

export default function LoginLayout({ children }) {
  return children;
}
