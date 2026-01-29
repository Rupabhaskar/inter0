// "use client";

// import { useEffect, useState } from "react";
// import JeeMainSyllabus from "@/components/JeeMainSyllabus";
// import JeeAdvancedSyllabus from "@/components/JeeAdvancedSyllabus";
// import ApEamcetSyllabus from "@/components/ApEamcetSyllabus";
// import Image from "next/image";

// export default function SyllabusModal() {
//   const [open, setOpen] = useState(false);
//   const [exam, setExam] = useState(null);
//   const [activeSubject, setActiveSubject] = useState("Mathematics");
//   const [search, setSearch] = useState("");

//   useEffect(() => {
//     const handleEsc = (e) => e.key === "Escape" && setOpen(false);
//     window.addEventListener("keydown", handleEsc);
//     return () => window.removeEventListener("keydown", handleEsc);
//   }, []);

//   const subjects = ["Mathematics", "Physics", "Chemistry"];

//   const openModal = (examType) => {
//     setExam(examType);
//     setActiveSubject("Mathematics");
//     setSearch("");
//     setOpen(true);
//   };

//   const getTitle = () => {
//     if (exam === "JEE") return "JEE Main Chapter-wise Syllabus";
//     if (exam === "JEEAD") return "JEE Advanced Chapter-wise Syllabus";
//     if (exam === "EAMCET") return "AP EAMCET Chapter-wise Syllabus";
//     return "";
//   };
//   return (
//     <>
//       {/* ================= HERO SECTION ================= */}
//       <section className="w-full bg-white overflow-x-hidden">
//         <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 lg:py-16 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">

//           {/* LEFT : CARDS */}
//          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-40 lg:gap-32 w-full">
//             <div className="xl:w-[250px] lg:w-[170px] md:w-[150px] h-auto md:h-[270px] lg:h-[300px] rounded-3xl shadow-xl bg-gradient-to-b from-indigo-600 to-blue-500 text-white flex flex-col justify-between p-5">
//               <div>
//                 <h2 className="text-2xl md:text-2xl font-bold mb-4">JEE<br />Main</h2>
//                 <p className="text-sm md:text-sm opacity-90 leading-relaxed">Chapter weightage</p>
//               </div>
//               <button
//                 onClick={() => openModal("JEE")}
//                 className="w-full sm:w-auto text-sm bg-cyan-300 text-indigo-900 py-3 rounded-full font-semibold hover:scale-105 transition"
//               >
//                 Explore Syllabus
//               </button>
//             </div>

//             <div className="xl:w-[250px] lg:w-[170px] md:w-[150px] h-auto md:h-[270px] lg:h-[300px] rounded-3xl shadow-xl bg-gradient-to-b from-purple-600 to-pink-500 text-white flex flex-col justify-between p-5">
//               <div>
//                 <h2 className="text-2xl md:text-2xl font-bold mb-4">JEE<br />Advanced</h2>
//                 <p className="text-sm md:text-sm opacity-90 leading-relaxed">IIT level<br />Concept & Depth</p>
//               </div>
//               <button
//                 onClick={() => openModal("JEEAD")}
//                 className="w-full sm:w-auto text-sm bg-pink-300 text-purple-900 py-3 rounded-full font-semibold hover:scale-105 transition"
//               >
//                 Explore Syllabus
//               </button>
//             </div>

//             <div className="xl:w-[250px] lg:w-[170px] md:w-[150px] h-auto md:h-[270px] lg:h-[300px] rounded-3xl shadow-xl bg-gradient-to-b from-emerald-500 to-lime-500 text-white flex flex-col justify-between p-5">
//               <div>
//                 <h2 className="text-2xl md:text-2xl font-bold mb-4">AP<br />EAMCET</h2>
//                 <p className="text-sm md:text-sm opacity-90 leading-relaxed">AP Intermediate<br />MPC</p>
//               </div>
//               <button
//                 onClick={() => openModal("EAMCET")}
//                 className="w-full text-sm sm:w-auto bg-yellow-300 text-emerald-900 py-3 rounded-full font-semibold hover:scale-105 transition"
//               >
//                 Explore Syllabus
//               </button>
//             </div>
//           </div>

//           {/* RIGHT : IMAGE */}
//           <div className="md:flex justify-center items-center">
//             <Image
//               src="/syllabus.jpg"
//               alt="Exam preparation illustration"
//               width={460}
//               height={460}
//               priority
//               className="w-full md:w-[380px] lg:w-[460px] xl:w-[540px] h-auto object-contain transform md:scale-110 lg:scale-100 transition-transform duration-300"
//             />
//           </div>
//         </div>
//       </section>

//       {/* BACKDROP */}
//       {open && (
//         <div
//           onClick={() => setOpen(false)}
//           className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
//         />
//       )}

//       {/* MODAL */}
//       <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}>
//         <div className="w-full h-full md:h-auto max-w-[980px] md:max-w-[1100px] xl:max-w-[1440px] mx-auto bg-indigo-900/40 backdrop-blur-xl border border-indigo-300/20 rounded-lg lg:rounded-3xl shadow-2xl overflow-hidden text-white">

//           <div className="sticky top-0 bg-indigo-900/60 px-4 md:px-6 py-3 md:py-4 border-b border-indigo-300/20">
//             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 md:mb-4 gap-3">
//               <h3 className="text-base md:text-lg font-semibold text-cyan-200">{getTitle()}</h3>
//               <button onClick={() => setOpen(false)} className="text-2xl hover:scale-110 transition text-cyan-200">✕</button>
//             </div>

//             <div className="flex gap-2 md:gap-3 mb-3 md:mb-4 flex-wrap">
//               {subjects.map((sub) => (
//                 <button
//                   key={sub}
//                   onClick={() => {
//                     setActiveSubject(sub);
//                     setSearch("");
//                   }}
//                   className={`px-3 md:px-5 py-2 rounded-full text-sm md:text-sm font-medium transition ${
//                     activeSubject === sub
//                       ? "bg-cyan-300 text-indigo-900"
//                       : "bg-indigo-800/40 text-cyan-200 hover:bg-indigo-700/60"
//                   }`}
//                 >
//                   {sub}
//                 </button>
//               ))}
//             </div>

//             <input
//               type="text"
//               placeholder="Search chapter..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               className="w-full bg-indigo-800/40 border border-indigo-300/20 rounded-lg px-3 md:px-4 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-300"
//             />
//           </div>

//           <div className="max-h-[65vh] md:max-h-[75vh] overflow-y-auto px-4 md:px-6 py-6">
//             {exam === "JEE" && <JeeMainSyllabus activeSubject={activeSubject} search={search} />}
//             {exam === "JEEAD" && <JeeAdvancedSyllabus activeSubject={activeSubject} search={search} />}
//             {exam === "EAMCET" && <ApEamcetSyllabus activeSubject={activeSubject} search={search} />}
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }
  


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
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 lg:py-16 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">

          {/* LEFT : CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12 lg:gap-16 xl:gap-24 w-full">

            {/* JEE MAIN */}
            <div className="xl:w-[250px] lg:w-[190px] md:w-[170px] h-auto md:h-[280px] rounded-3xl shadow-xl bg-gradient-to-b from-indigo-600 to-blue-500 text-white flex flex-col justify-between p-5">
              <div>
                <h2 className="text-2xl font-bold mb-4">JEE<br />Main</h2>
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
            <div className="xl:w-[250px] lg:w-[190px] md:w-[170px] h-auto md:h-[280px] rounded-3xl shadow-xl bg-gradient-to-b from-purple-600 to-pink-500 text-white flex flex-col justify-between p-5">
              <div>
                <h2 className="text-2xl font-bold mb-4">JEE<br />Advanced</h2>
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
            <div className="xl:w-[250px] lg:w-[190px] md:w-[170px] h-auto md:h-[280px] rounded-3xl shadow-xl bg-gradient-to-b from-emerald-500 to-lime-500 text-white flex flex-col justify-between p-5">
              <div>
                <h2 className="text-2xl font-bold mb-4">AP<br />EAMCET</h2>
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
          <div className="flex justify-center">
            <Image
              src="/syllabus.jpg"
              alt="Exam prep"
              width={460}
              height={460}
              priority
              className="w-full md:w-[400px] lg:w-[480px] xl:w-[540px] object-contain"
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
