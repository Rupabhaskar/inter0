// "use client";

// export default function JeeAdvancedSyllabus({
//   activeSubject = "Mathematics",
//   search = "",
// }) {
//   const syllabus = {
//     Mathematics: {
//       class11: [
//         ["Sets, Relations & Functions", "1"],
//         ["Complex Numbers", "2–3"],
//         ["Quadratic Equations", "1–2"],
//         ["Theory of Equations", "1"],
//         ["Permutations & Combinations", "1–2"],
//         ["Binomial Theorem", "1–2"],
//         ["Sequences & Series", "2–3"],
//         ["Trigonometric Functions", "1–2"],
//         ["Straight Lines", "1"],
//         ["Pair of Straight Lines", "1"],
//         ["Circles", "1–2"],
//         ["Conic Sections (P/E/H)", "2–3"],
//         ["Limits & Continuity", "2"],
//         ["Differentiation (Basics)", "2"],
//       ],
//       class12: [
//         ["Applications of Derivatives", "2–3"],
//         ["Indefinite Integrals", "2–3"],
//         ["Definite Integrals", "2–3"],
//         ["Differential Equations", "1–2"],
//         ["Matrices", "1–2"],
//         ["Determinants", "1–2"],
//         ["Vector Algebra", "2"],
//         ["3D Geometry", "2–3"],
//         ["Probability", "2"],
//       ],
//     },

//     Physics: {
//       class11: [
//         ["Units & Dimensions", "1"],
//         ["Kinematics", "1–2"],
//         ["Laws of Motion", "2"],
//         ["Work, Energy & Power", "2"],
//         ["Centre of Mass & Rotation", "3"],
//         ["Gravitation", "1"],
//         ["Mechanical Properties of Matter", "1"],
//         ["Thermal Properties of Matter", "1"],
//         ["Thermodynamics", "2–3"],
//         ["Kinetic Theory of Gases", "1"],
//         ["Oscillations (SHM)", "1"],
//         ["Waves", "1"],
//       ],
//       class12: [
//         ["Electrostatics", "2–3"],
//         ["Capacitance", "1"],
//         ["Current Electricity", "2"],
//         ["Magnetic Effects of Current", "2"],
//         ["Electromagnetic Induction", "2"],
//         ["Alternating Current", "1"],
//         ["Electromagnetic Waves", "1"],
//         ["Ray Optics", "2"],
//         ["Wave Optics", "1"],
//         ["Dual Nature of Radiation", "1"],
//         ["Atoms & Nuclei", "2"],
//         ["Semiconductors", "2"],
//       ],
//     },

//     Chemistry: {
//       class11: [
//         ["Mole Concept & Stoichiometry", "1–2"],
//         ["Atomic Structure", "1"],
//         ["Periodic Table & Trends", "1"],
//         ["Chemical Bonding", "2–3"],
//         ["States of Matter", "1"],
//         ["Thermodynamics", "2"],
//         ["Chemical Equilibrium", "1–2"],
//         ["Ionic Equilibrium", "2"],
//         ["Redox Reactions", "1"],
//         ["s-Block Elements", "1"],
//         ["p-Block (Group 13–14)", "1"],
//         ["General Organic Chemistry (GOC)", "2–3"],
//         ["Hydrocarbons", "1–2"],
//       ],
//       class12: [
//         ["Solid State", "1"],
//         ["Solutions", "1"],
//         ["Electrochemistry", "2–3"],
//         ["Chemical Kinetics", "1–2"],
//         ["Surface Chemistry", "1"],
//         ["p-Block (15–18)", "2"],
//         ["d & f Block Elements", "1–2"],
//         ["Coordination Compounds", "3"],
//         ["Metallurgy", "1"],
//         ["Haloalkanes & Haloarenes", "1"],
//         ["Alcohols, Phenols & Ethers", "2"],
//         ["Aldehydes & Ketones", "2"],
//         ["Carboxylic Acids", "1"],
//         ["Amines", "1–2"],
//         ["Biomolecules", "1"],
//         ["Polymers", "1"],
//         ["Chemistry in Everyday Life", "1"],
//       ],
//     },
//   };

//   const filterChapters = (chapters) =>
//     chapters.filter(([name]) =>
//       name.toLowerCase().includes(search.toLowerCase())
//     );

//   const subjectData = syllabus[activeSubject];

//   return (
//     <div className="space-y-10">
//       {["class11", "class12"].map((cls) => (
//         <div key={cls}>
//           <h3 className="text-xl font-semibold mb-4 text-white">
//             {cls === "class11" ? "Class 11" : "Class 12"}
//           </h3>

//           <ul className="space-y-2">
//             {filterChapters(subjectData[cls]).map(([chapter, bits]) => (
//               <li
//                 key={chapter}
//                 className="flex justify-between items-center bg-white/10 border border-white/20 px-4 py-2 rounded-lg"
//               >
//                 <span className="text-white">{chapter}</span>
//                 <span className="text-yellow-300 font-medium">
//                   {bits} bits
//                 </span>
//               </li>
//             ))}
//           </ul>
//         </div>
//       ))}
//     </div>
//   );
// }



"use client";

export default function JeeAdvancedSyllabus({
  activeSubject = "Mathematics",
  search = "",
}) {
  const syllabus = {
    Mathematics: {
      class11: [
        ["Sets, Relations & Functions", "1"],
        ["Complex Numbers", "2–3"],
        ["Quadratic Equations", "1–2"],
        ["Theory of Equations", "1"],
        ["Permutations & Combinations", "1–2"],
        ["Binomial Theorem", "1–2"],
        ["Sequences & Series", "2–3"],
        ["Trigonometric Functions", "1–2"],
        ["Straight Lines", "1"],
        ["Pair of Straight Lines", "1"],
        ["Circles", "1–2"],
        ["Conic Sections (P/E/H)", "2–3"],
        ["Limits & Continuity", "2"],
        ["Differentiation (Basics)", "2"],
      ],
      class12: [
        ["Applications of Derivatives", "2–3"],
        ["Indefinite Integrals", "2–3"],
        ["Definite Integrals", "2–3"],
        ["Differential Equations", "1–2"],
        ["Matrices", "1–2"],
        ["Determinants", "1–2"],
        ["Vector Algebra", "2"],
        ["3D Geometry", "2–3"],
        ["Probability", "2"],
      ],
    },

    Physics: {
      class11: [
        ["Units & Dimensions", "1"],
        ["Kinematics", "1–2"],
        ["Laws of Motion", "2"],
        ["Work, Energy & Power", "2"],
        ["Centre of Mass & Rotation", "3"],
        ["Gravitation", "1"],
        ["Mechanical Properties of Matter", "1"],
        ["Thermal Properties of Matter", "1"],
        ["Thermodynamics", "2–3"],
        ["Kinetic Theory of Gases", "1"],
        ["Oscillations (SHM)", "1"],
        ["Waves", "1"],
      ],
      class12: [
        ["Electrostatics", "2–3"],
        ["Capacitance", "1"],
        ["Current Electricity", "2"],
        ["Magnetic Effects of Current", "2"],
        ["Electromagnetic Induction", "2"],
        ["Alternating Current", "1"],
        ["Electromagnetic Waves", "1"],
        ["Ray Optics", "2"],
        ["Wave Optics", "1"],
        ["Dual Nature of Radiation", "1"],
        ["Atoms & Nuclei", "2"],
        ["Semiconductors", "2"],
      ],
    },

    Chemistry: {
      class11: [
        ["Mole Concept & Stoichiometry", "1–2"],
        ["Atomic Structure", "1"],
        ["Periodic Table & Trends", "1"],
        ["Chemical Bonding", "2–3"],
        ["States of Matter", "1"],
        ["Thermodynamics", "2"],
        ["Chemical Equilibrium", "1–2"],
        ["Ionic Equilibrium", "2"],
        ["Redox Reactions", "1"],
        ["s-Block Elements", "1"],
        ["p-Block (Group 13–14)", "1"],
        ["General Organic Chemistry (GOC)", "2–3"],
        ["Hydrocarbons", "1–2"],
      ],
      class12: [
        ["Solid State", "1"],
        ["Solutions", "1"],
        ["Electrochemistry", "2–3"],
        ["Chemical Kinetics", "1–2"],
        ["Surface Chemistry", "1"],
        ["p-Block (15–18)", "2"],
        ["d & f Block Elements", "1–2"],
        ["Coordination Compounds", "3"],
        ["Metallurgy", "1"],
        ["Haloalkanes & Haloarenes", "1"],
        ["Alcohols, Phenols & Ethers", "2"],
        ["Aldehydes & Ketones", "2"],
        ["Carboxylic Acids", "1"],
        ["Amines", "1–2"],
        ["Biomolecules", "1"],
        ["Polymers", "1"],
        ["Chemistry in Everyday Life", "1"],
      ],
    },
  };

  const filterChapters = (chapters) =>
    chapters.filter(([name]) =>
      name.toLowerCase().includes(search.toLowerCase())
    );

  const subjectData = syllabus[activeSubject];

  return (
    <div className="space-y-8">

      {/* 🔔 IMPORTANT NOTE */}
      <div className="bg-yellow-400/10 border border-yellow-300/30 text-yellow-200 px-4 py-3 rounded-xl text-sm">
        <strong>Note:</strong> The JEE Advanced exam does not have a fixed number
        of questions. The total question count and marking scheme may vary every
        year at the discretion of the organizing institute.
      </div>

      {["class11", "class12"].map((cls) => (
        <div key={cls}>
          <h3 className="text-xl font-semibold mb-4 text-white">
            {cls === "class11" ? "Class 11" : "Class 12"}
          </h3>

          <ul className="space-y-2">
            {filterChapters(subjectData[cls]).map(([chapter, bits]) => (
              <li
                key={chapter}
                className="flex justify-between items-center bg-white/10 border border-white/20 px-4 py-2 rounded-lg"
              >
                <span className="text-white">{chapter}</span>
                <span className="text-yellow-300 font-medium">
                  {bits} bits
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
