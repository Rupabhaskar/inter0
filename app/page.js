import Link from "next/link";
import Image from "next/image";
import JeeSyllabusModal from "../components/JeeSyllabusModal";
import DashboardSample from "../components/DashboardSample";
import { siteUrl, publicImages, getHomeImageSchema } from "@/lib/seo";

export const metadata = {
  title: "RankSprint | Inter JEE Mock Test & EAMCET Mock Test – Practice Online",
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
  ],
  openGraph: {
    title: "RankSprint | Inter JEE Mock Test & EAMCET Mock Test",
    description: "Inter JEE mock test and EAMCET mock test on RankSprint. JEE Main, JEE Advanced & AP EAMCET online mock tests for inter students.",
    url: siteUrl,
  },
  alternates: { canonical: siteUrl },
};

function HomeImageSchema() {
  const schema = getHomeImageSchema();
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

function HomeFaqSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is RankSprint?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "RankSprint is India's online platform for inter JEE mock test and EAMCET mock test. It offers JEE Main, JEE Advanced and AP EAMCET mock tests for inter students with real exam interface and instant results.",
        },
      },
      {
        "@type": "Question",
        name: "Where can I take inter JEE mock test and EAMCET mock test?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "RankSprint offers inter JEE mock test and EAMCET mock test online. You can practice JEE Main, JEE Advanced and AP EAMCET mock tests for inter students at RankSprint.",
        },
      },
      {
        "@type": "Question",
        name: "Is RankSprint free for JEE and EAMCET mock test?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "RankSprint provides online mock tests for JEE Main, JEE Advanced and AP EAMCET for inter students. Practice with real exam interface and get instant results.",
        },
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <HomeImageSchema />
      <HomeFaqSchema />
      <header className="max-w-7xl mt-[-15px] mx-auto p-6 flex justify-between items-center">
        <Link href="/" className="flex items-center shrink-0 h-12 md:h-14 w-32 md:w-36 overflow-hidden rounded">
          <Image
            src={publicImages.logo.src}
            alt={publicImages.logo.alt}
            width={300}
            height={90}
            className="h-full w-full object-cover object-center"
            priority
          />
        </Link>
        <Link href="/college" className="text-sm font-medium text-blue-600 hover:underline">
          College Login
        </Link>
      </header>

      <section className="relative flex flex-col md:min-h-[80vh] md:flex-row md:items-center overflow-hidden">
        {/* Mobile only: title + description first */}
        <div className="px-6 pt-4 pb-2 md:hidden">
          <h2 className="text-3xl font-bold leading-tight text-center text-[#0B1935]">
            Practice JEE & AP EAMCET <br />Like a Real Exam
          </h2>
          <p className="mt-4 text-base leading-relaxed text-center text-[#0B1935] max-w-xl mx-auto">
            Full-length mock tests with real exam interface, instant results,
            detailed analysis, and performance tracking.
          </p>
        </div>

        {/* Image: mobile = in flow + white border. Desktop = full-bleed background */}
        <div className="relative w-full aspect-[4/3] flex-shrink-0 border-[5px] border-white md:absolute md:inset-0 md:aspect-auto md:scale-[1.25] md:border-0">
          <Image
            src={publicImages.hero.src}
            alt={publicImages.hero.alt}
            fill
            priority
            className="object-cover w-full h-full"
          />
        </div>

        {/* Mobile only: buttons below image */}
        <div className="px-6 py-6 flex flex-col gap-3 md:hidden">
          <Link
            href="/login"
            className="w-full text-center px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
          >
            Student Login
          </Link>
          <Link
            href="/select-test"
            className="w-full text-center px-6 py-3 border border-[#0B1935] rounded-lg hover:bg-[#0B1935]/10 transition"
          >
            Explore Tests
          </Link>
        </div>

        {/* Desktop only: overlay – text and buttons on image */}
        <div className="absolute inset-0 bg-white/15 hidden md:block" />
        <div className="hidden md:grid relative z-10 max-w-7xl mx-auto px-6 w-full grid-cols-[65%_35%] py-0">
          <div />
          <div className="text-[#0B1935] drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]">
            <h2 className="text-4xl font-bold mb-4 leading-tight text-left">
              Practice JEE & AP EAMCET <br />Like a Real Exam
            </h2>
            <p className="mb-6 max-w-xl text-lg leading-relaxed text-left">
              Full-length mock tests with real exam interface, instant results,
              detailed analysis, and performance tracking.
            </p>
            <div className="flex flex-row gap-4 items-start">
              <Link
                href="/login"
                className="text-center px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
              >
                Student Login
              </Link>
              <Link
                href="/select-test"
                className="text-center px-6 py-3 border border-[#0B1935] rounded-lg hover:bg-[#0B1935]/10 transition"
              >
                Explore Tests
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-t">
        <div className="max-w-7xl 2xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
          <h3 className="text-2xl font-bold mb-6 md:mb-8 text-center">Why Choose This Platform?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl md:max-w-none mx-auto">
            <Feature title="Real CBT Interface" desc="Practice exactly like JEE & AP EAMCET exams." />
            <Feature title="Instant Results" desc="Get score and performance immediately." />
            <Feature title="Detailed Analysis" desc="Learn from mistakes with question-wise analysis." />
          </div>
        </div>
      </section>

      <div className="py-4 md:py-6 flex items-center justify-center px-4">
        <JeeSyllabusModal />
      </div>

      {/* College Dashboard – My Dashboard, why it's special, features */}
      <section className="bg-slate-100 border-t border-slate-200">
        <div className="max-w-7xl 2xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <DashboardSample />

          <div className="mb-12">
            <h4 className="text-xl font-bold text-[#0B1935] mb-6 md:mb-8 text-center">
              Why it&apos;s so special
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              <SpecialCard
                delay={0}
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                }
                title="One dashboard for everything"
                description="Track students, mock tests, attempts, and scores for JEE Mains and JEE Advanced in a single view."
                accentColor="blue"
              />
              <SpecialCard
                delay={120}
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
                title="Data you can act on"
                description="See best-performing subjects, weakest areas, and top performers so you can guide students better."
                accentColor="emerald"
              />
              <SpecialCard
                delay={240}
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
                title="Built for institutes"
                description="Designed for college admins: leaderboard, reports, insights, and test management in one place."
                accentColor="indigo"
              />
            </div>
          </div>
        </div>

        {/* Features you get – full width, white background */}
        <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] bg-white border-y border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)]">
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(to right, #0ea5e9 1px, transparent 1px), linear-gradient(to bottom, #0ea5e9 1px, transparent 1px)", backgroundSize: "32px 32px" }} aria-hidden />
          <div className="relative max-w-7xl 2xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="text-center mb-10 md:mb-12">
              <span className="inline-block text-cyan-600 text-xs font-semibold uppercase tracking-wider mb-2">Dashboard</span>
              <h4 className="text-2xl md:text-3xl font-bold text-[#0B1935] mb-2">
                Features you get
              </h4>
              <div className="w-14 h-0.5 bg-cyan-500/80 rounded-full mx-auto mb-4" />
              <p className="text-slate-600 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                Everything you need to run mock tests and track performance in one dashboard.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <DashboardFeature title="Centralised students data management" desc="Manage all student data in one place — add, edit, and track students across tests." />
              <DashboardFeature title="Total Students & Mock Tests" desc="See how many students and tests are active." />
              <DashboardFeature title="Attempts & Average Score" desc="Total attempts and average score across exams." />
              <DashboardFeature title="Topper Score & Accuracy %" desc="Topper score and overall accuracy at a glance." />
              <DashboardFeature title="Active Tests & Pass %" desc="Number of active tests and pass percentage." />
              <DashboardFeature title="Exam Performance" desc="Performance breakdown by exam (e.g. JEE Mains)." />
              <DashboardFeature title="Best Performing Subject" desc="Subject with highest average score." />
              <DashboardFeature title="Weakest Area" desc="Subject that needs improvement with avg score." />
              <DashboardFeature title="Top Performers" desc="Ranked list of students with exam and score." />
              <DashboardFeature title="Subject-wise Average Score" desc="Visual bars for Physics, Math, Chemistry, etc." />
              <DashboardFeature title="Leaderboard, Reports & Insights" desc="Leaderboard, detailed reports, and insights." />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-cyan-500/20 bg-[#0B1935]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm">
            <Link href="/blog" className="text-cyan-300 hover:text-white transition-colors">
              Blogs
            </Link>
            <span className="hidden sm:inline text-slate-500">·</span>
            <a href="tel:+918500947079" className="text-slate-300 hover:text-cyan-200 transition-colors">
              +91 85009 47079
            </a>
            <span className="hidden sm:inline text-slate-500">·</span>
            <a href="https://wa.me/918500947079" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-cyan-200 transition-colors">
              WhatsApp
            </a>
            <span className="hidden sm:inline text-slate-500">·</span>
            <a href="mailto:Shyamtech.dm@gmail.com" className="text-slate-300 hover:text-cyan-200 transition-colors break-all">
              Shyamtech.dm@gmail.com
            </a>
          </div>
          <p className="text-center text-slate-500 text-xs mt-4">
            © {new Date().getFullYear()} RankSprint Platform
          </p>
        </div>
      </footer>
    </div>
  );
}

/* Feature Card */
function Feature({ title, desc }) {
  return (
    <div className="border rounded-lg p-5 md:p-6 text-center shadow-sm hover:shadow transition-shadow duration-200 border-slate-200/80">
      <h4 className="font-semibold mb-2">{title}</h4>
      <p className="text-sm text-slate-600">{desc}</p>
    </div>
  );
}

/* Dashboard feature item – card on full-width white section */
function DashboardFeature({ title, desc }) {
  return (
    <div className="group relative bg-slate-50/80 rounded-xl p-5 md:p-6 min-h-[108px] border-l-4 border-l-cyan-500 border border-slate-200/90 shadow-sm hover:shadow-lg hover:bg-white hover:-translate-y-1 hover:border-cyan-400/70 transition-all duration-300">
      <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-cyan-400/80 group-hover:bg-cyan-500 group-hover:scale-125 transition-transform duration-300" aria-hidden />
      <h5 className="font-bold text-sm text-[#0B1935] mb-2 pr-5 leading-snug">{title}</h5>
      <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}

/* Why it's so special – attractive card with icon, accent, Inter + geometry + animation */
const accentStyles = {
  blue: {
    iconBg: "bg-blue-100 text-blue-600",
    border: "border-l-blue-500",
    geometric: "text-blue-200/60",
  },
  emerald: {
    iconBg: "bg-emerald-100 text-emerald-600",
    border: "border-l-emerald-500",
    geometric: "text-emerald-200/60",
  },
  indigo: {
    iconBg: "bg-indigo-100 text-indigo-600",
    border: "border-l-indigo-500",
    geometric: "text-indigo-200/60",
  },
};

function SpecialCard({ icon, title, description, accentColor = "blue", delay = 0 }) {
  const style = accentStyles[accentColor] || accentStyles.blue;
  return (
    <div
      className={`group relative bg-white rounded-xl p-6 md:p-7 shadow-md border border-slate-200/80 border-l-4 ${style.border} overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] animate-fade-in-up-special`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Geometric corner accent */}
      <div className={`absolute top-0 right-0 w-24 h-24 opacity-80 transition-opacity duration-300 group-hover:opacity-100 ${style.geometric}`} aria-hidden>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path fill="currentColor" d="M100 0 L100 100 L0 100 Z" />
        </svg>
      </div>
      <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full border-2 border-dashed border-slate-200/70 opacity-60 group-hover:opacity-80 transition-opacity duration-300" aria-hidden />
      <div className="relative">
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 ${style.iconBg} transition-transform duration-500 ease-out group-hover:scale-110 group-hover:rotate-3`}>
          {icon}
        </div>
        <h5 className="font-bold text-[#0B1935] text-lg mb-2">{title}</h5>
        <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
