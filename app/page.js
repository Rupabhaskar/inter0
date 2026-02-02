import Link from "next/link";
import Image from "next/image";
import JeeSyllabusModal from "../components/JeeSyllabusModal";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="max-w-7xl mx-auto p-6 flex justify-between items-center">
        <Link href="/" className="flex items-center shrink-0 h-12 sm:h-14 md:h-16 w-32 sm:w-36 md:w-40 overflow-hidden rounded">
          <span className="block h-full w-full scale-100">
            <Image
              src="/Ranksprint.png"
              alt="RankSprint - Practice. Perform. Achieve."
              width={300}
              height={90}
              className="h-full w-full object-cover object-center"
              priority
            />
          </span>
        </Link>
        <Link
          href="/college/dashboard"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          College Login
        </Link>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        {/* Background Image - zoomed for visual impact */}
        <div className="absolute inset-0 scale-[1.25]">
          <Image
            src="/hero.jpg"
            alt="Student taking online exam"
            fill
            priority
            className="object-cover w-full h-full"
          />
        </div>

        {/* Light Overlay */}
        <div className="absolute inset-0 bg-white/15"></div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full grid md:grid-cols-[65%_35%]">
          {/* Left Empty Space */}
          <div></div>

          {/* Right Side Text */}
          <div className="text-[#0B1935] drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight md:leading-[1.05] lg:leading-tight text-center md:text-left">
              Practice JEE & AP EAMCET <br />
              Like a Real Exam
            </h2>

            <p className="mb-6 max-w-xl mx-auto md:mx-0 text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed md:leading-7 text-center md:text-left">
              Full-length mock tests with real exam interface, instant results,
              detailed analysis, and performance tracking.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center sm:items-start">
              <Link
                href="/login"
                className="w-full sm:w-auto text-center px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
              >
                Student Login
              </Link>

              <Link
                href="/select-test"
                className="w-full sm:w-auto text-center px-6 py-3 border border-[#0B1935] rounded-lg hover:bg-[#0B1935]/10 transition"
              >
                Explore Tests
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h3 className="text-2xl font-bold mb-10 text-center">
            Why Choose This Platform?
          </h3>

          <div className="grid md:grid-cols-3 gap-6">
            <Feature
              title="Real CBT Interface"
              desc="Practice exactly like JEE & AP EAMCET exams."
            />
            <Feature
              title="Instant Results"
              desc="Get score and performance immediately."
            />
            <Feature
              title="Detailed Analysis"
              desc="Learn from mistakes with question-wise analysis."
            />
          </div>
        </div>
      </section>
      <div className="min-h-screen mt-[-100px] flex items-center justify-center px-4">
      <JeeSyllabusModal />
    </div>

      {/* Footer */}
      <footer className="text-center text-sm text-slate-500 py-6">
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
