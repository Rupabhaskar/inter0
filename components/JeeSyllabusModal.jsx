"use client";

import { useEffect, useState } from "react";
import JeeMainSyllabus from "@/components/JeeMainSyllabus";
import JeeAdvancedSyllabus from "@/components/JeeAdvancedSyllabus";
import ApEamcetSyllabus from "@/components/ApEamcetSyllabus";
import Image from "next/image";

export default function SyllabusModal() {
  const [open, setOpen] = useState(false);
  const [exam, setExam] = useState(null);
  const [activeSubject, setActiveSubject] = useState("Mathematics");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handleEsc = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const subjects = ["Mathematics", "Physics", "Chemistry"];

  const openModal = (examType) => {
    setExam(examType);
    setActiveSubject("Mathematics");
    setSearch("");
    setOpen(true);
  };

  const getTitle = () => {
    if (exam === "JEE") return "JEE Main Chapter-wise Syllabus";
    if (exam === "JEEAD") return "JEE Advanced Chapter-wise Syllabus";
    if (exam === "EAMCET") return "AP EAMCET Chapter-wise Syllabus";
    return "";
  };

  return (
    <>
      {/* ================= HERO SECTION ================= */}
      <section className="w-full bg-white overflow-x-hidden">
        <div className="max-w-7xl 2xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 grid grid-cols-1 md:grid-cols-[1.45fr_1fr] lg:grid-cols-[1.55fr_1fr] gap-6 md:gap-10 lg:gap-8 items-center">

          {/* LEFT : CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-24 lg:gap-6 w-full max-w-3xl sm:max-w-4xl md:max-w-none mx-auto md:mx-0 min-w-0">
            {/* JEE MAIN */}
            <div className="w-full min-w-[150px] min-h-[240px] md:min-h-[260px] rounded-2xl shadow-lg bg-gradient-to-b from-indigo-600 to-blue-500 text-white flex flex-col justify-between p-4 md:p-5 hover:shadow-xl transition-shadow duration-200">
              <div className="min-w-0">
                <h2 className="text-2xl font-bold mb-4 break-words">JEE<br />Main</h2>
                <p className="text-sm opacity-90">Chapter weightage</p>
              </div>
              <button
                onClick={() => openModal("JEE")}
                className="w-full text-sm bg-cyan-300 text-indigo-900 py-3 rounded-full font-semibold hover:scale-105 transition"
              >
                Explore Syllabus
              </button>
            </div>

            {/* JEE ADV */}
            <div className="w-full min-w-[150px] min-h-[240px] md:min-h-[260px] rounded-2xl shadow-lg bg-gradient-to-b from-purple-600 to-pink-500 text-white flex flex-col justify-between p-4 md:p-5 hover:shadow-xl transition-shadow duration-200">
              <div className="min-w-0">
                <h2 className="text-2xl font-bold mb-4 break-words">JEE<br />Advanced</h2>
                <p className="text-sm opacity-90">IIT Level Depth</p>
              </div>
              <button
                onClick={() => openModal("JEEAD")}
                className="w-full text-sm bg-pink-300 text-purple-900 py-3 rounded-full font-semibold hover:scale-105 transition"
              >
                Explore Syllabus
              </button>
            </div>

            {/* EAMCET */}
            <div className="w-full min-w-[150px] min-h-[240px] md:min-h-[260px] rounded-2xl shadow-lg bg-gradient-to-b from-emerald-500 to-lime-500 text-white flex flex-col justify-between p-4 md:p-5 hover:shadow-xl transition-shadow duration-200">
              <div className="min-w-0">
                <h2 className="text-2xl font-bold mb-4 break-words">AP<br />EAMCET</h2>
                <p className="text-sm opacity-90">AP Intermediate MPC</p>
              </div>
              <button
                onClick={() => openModal("EAMCET")}
                className="w-full text-sm bg-yellow-300 text-emerald-900 py-3 rounded-full font-semibold hover:scale-105 transition"
              >
                Explore Syllabus
              </button>
            </div>
          </div>

          {/* RIGHT IMAGE */}
          <div className="flex justify-center items-center">
            <Image
              src="/syllabus.jpg"
              alt="JEE Main JEE Advanced AP EAMCET syllabus – RankSprint exam preparation"
              width={460}
              height={460}
              priority
              className="w-full max-w-[280px] sm:max-w-[340px] md:max-w-[380px] lg:max-w-[420px] xl:max-w-[460px] object-contain"
            />
          </div>
        </div>
      </section>

      {/* BACKDROP */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
      )}

      {/* ================= MODAL ================= */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
          <div className="w-full h-full md:h-auto max-w-[1100px] xl:max-w-[1400px] bg-indigo-900/40 backdrop-blur-xl border border-indigo-300/20 rounded-2xl shadow-2xl text-white animate-fadeIn overflow-hidden">

            {/* HEADER */}
            <div className="sticky top-0 bg-indigo-900/70 px-6 py-4 border-b border-indigo-300/20">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-cyan-200">{getTitle()}</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="text-2xl hover:scale-110 transition"
                >
                  ✕
                </button>
              </div>

              {/* SUBJECTS */}
              <div className="flex gap-3 flex-wrap mb-4">
                {subjects.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => {
                      setActiveSubject(sub);
                      setSearch("");
                    }}
                    className={`px-5 py-2 rounded-full text-sm font-medium ${
                      activeSubject === sub
                        ? "bg-cyan-300 text-indigo-900"
                        : "bg-indigo-800/50 text-cyan-200 hover:bg-indigo-700"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search chapter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-indigo-800/50 border border-indigo-300/20 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-300"
              />
            </div>

            {/* CONTENT */}
            <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
              {exam === "JEE" && <JeeMainSyllabus activeSubject={activeSubject} search={search} />}
              {exam === "JEEAD" && <JeeAdvancedSyllabus activeSubject={activeSubject} search={search} />}
              {exam === "EAMCET" && <ApEamcetSyllabus activeSubject={activeSubject} search={search} />}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
