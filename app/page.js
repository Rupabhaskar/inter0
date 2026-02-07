import Link from "next/link";
import Image from "next/image";
import JeeSyllabusModal from "../components/JeeSyllabusModal";
import DashboardSampleButton from "../components/DashboardSampleButton";
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
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h3 className="text-2xl font-bold mb-10 text-center">Why Choose This Platform?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Feature title="Real CBT Interface" desc="Practice exactly like JEE & AP EAMCET exams." />
            <Feature title="Instant Results" desc="Get score and performance immediately." />
            <Feature title="Detailed Analysis" desc="Learn from mistakes with question-wise analysis." />
          </div>
        </div>
      </section>

      <div className="min-h-screen flex items-center justify-center px-4">
        <JeeSyllabusModal />
      </div>

      {/* College Dashboard – My Dashboard, why it's special, features */}
      <section className="bg-slate-100  mt-[10px] md:mt-[-300px] lg:mt-[-300px] xl:mt-[-360px] 2xl:mt-[-500px] border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold text-[#0B1935] mb-3">
              College Dashboard
            </h3>
            <p className="text-slate-600 max-w-2xl mx-auto mb-6">
              JEE Mains • JEE Advanced • Institute Mock Analytics — all in one place for your college.
            </p>
            <DashboardSampleButton />
          </div>

          <div className="mb-12">
            <h4 className="text-xl font-bold text-[#0B1935] mb-4 text-center">
              Why it&apos;s so special
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
                <h5 className="font-semibold text-[#0B1935] mb-2">One dashboard for everything</h5>
                <p className="text-sm text-slate-600">
                  Track students, mock tests, attempts, and scores for JEE Mains and JEE Advanced in a single view.
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
                <h5 className="font-semibold text-[#0B1935] mb-2">Data you can act on</h5>
                <p className="text-sm text-slate-600">
                  See best-performing subjects, weakest areas, and top performers so you can guide students better.
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
                <h5 className="font-semibold text-[#0B1935] mb-2">Built for institutes</h5>
                <p className="text-sm text-slate-600">
                  Centralised student data management, leaderboard, reports, insights, and test management in one place.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xl font-bold text-[#0B1935] mb-4 text-center">
              Features you get
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <DashboardFeature title="Centralised Students Data Management" desc="Manage all student profiles, classes, and data in one place." />
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

      <footer className="text-center text-sm text-slate-500 py-6">
        <Link href="/blog" className="inline-block text-blue-600 hover:underline mb-2 md:mb-0 md:mr-4">
          Blogs
        </Link>
        <span className="hidden md:inline md:mr-4">·</span>
        © {new Date().getFullYear()} RankSprint Platform
      </footer>
    </div>
  );
}

/* Feature Card */
function Feature({ title, desc }) {
  return (
    <div className="border rounded-lg p-6 text-center shadow-sm hover:shadow-md transition">
      <h4 className="font-semibold mb-2">{title}</h4>
      <p className="text-sm text-slate-600">{desc}</p>
    </div>
  );
}

/* Dashboard feature item for College Dashboard section */
function DashboardFeature({ title, desc }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
      <h5 className="font-semibold text-sm text-[#0B1935] mb-1">{title}</h5>
      <p className="text-xs text-slate-600">{desc}</p>
    </div>
  );
}
