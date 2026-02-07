import "./globals.css";
import { Orbitron, Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/components/AuthProvider";
import {
  defaultMetadata,
  getOrganizationSchema,
  getWebSiteSchema,
} from "@/lib/seo";

export const metadata = defaultMetadata;

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-ai",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function RootLayout({ children }) {
  const organizationSchema = getOrganizationSchema();
  const websiteSchema = getWebSiteSchema();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement.classList;var s=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)');var dark=s==='dark'||(s!=='light'&&m.matches);d.toggle('dark',dark);})();`,
          }}
        />
      </head>
      <body className={`bg-white text-black ${orbitron.variable} ${inter.variable}`}>
        <JsonLd data={organizationSchema} />
        <JsonLd data={websiteSchema} />
        <AuthProvider>
          <Navbar />
          <main className="pt-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
