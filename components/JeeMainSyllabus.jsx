"use client";

export default function JeeMainSyllabus({
  activeSubject = "Mathematics",
  search = "",
}) {
  const syllabus = {
    Mathematics: {
      class11: [
        ["Sets & Relations", "1–2"],
        ["Functions", "1"],
        ["Trigonometric Functions", "1–2"],
        ["Complex Numbers", "2"],
        ["Quadratic Equations", "1"],
        ["Permutations & Combinations", "1–2"],
        ["Binomial Theorem", "1–2"],
        ["Sequences & Series", "2"],
        ["Straight Lines", "1"],
        ["Circles", "1–2"],
        ["Conic Sections", "2"],
        ["Statistics", "1"],
      ],
      class12: [
        ["Limits & Continuity", "1–2"],
        ["Differentiability", "1–2"],
        ["Application of Derivatives", "2–3"],
        ["Indefinite Integrals", "2"],
        ["Definite Integrals", "2–3"],
        ["Area Under Curve", "1"],
        ["Differential Equations", "1"],
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
        ["Laws of Motion", "1–2"],
        ["Work, Energy & Power", "2"],
        ["Rotation", "2–3"],
        ["Gravitation", "1"],
        ["Properties of Solids", "1"],
        ["Properties of Fluids", "1"],
        ["Thermodynamics", "2"],
        ["KTG", "1"],
        ["Oscillations", "1"],
        ["Waves", "1"],
      ],
      class12: [
        ["Electrostatics", "2–3"],
        ["Capacitors", "1"],
        ["Current Electricity", "2–3"],
        ["Magnetic Effects", "2"],
        ["EMI", "1–2"],
        ["AC", "1"],
        ["EM Waves", "1"],
        ["Ray Optics", "2"],
        ["Wave Optics", "1"],
        ["Dual Nature", "1"],
        ["Atoms & Nuclei", "2"],
        ["Semiconductors", "2"],
      ],
    },

    Chemistry: {
      class11: [
        ["Mole Concept", "1–2"],
        ["Atomic Structure", "1"],
        ["Thermodynamics", "2"],
        ["Chemical Equilibrium", "1–2"],
        ["Ionic Equilibrium", "1–2"],
        ["States of Matter", "1"],
        ["Redox Reactions", "1"],
        ["Periodic Table", "1–2"],
        ["Chemical Bonding", "2–3"],
        ["GOC", "2–3"],
        ["Hydrocarbons", "1–2"],
      ],
      class12: [
        ["Electrochemistry", "2"],
        ["Chemical Kinetics", "1–2"],
        ["Solutions", "1"],
        ["Coordination Compounds", "2–3"],
        ["d & f Block", "1–2"],
        ["Metallurgy", "1"],
        ["Haloalkanes & Haloarenes", "1"],
        ["Alcohols, Phenols & Ethers", "2"],
        ["Aldehydes & Ketones", "2"],
        ["Amines", "1–2"],
        ["Biomolecules", "1"],
        ["Polymers + CIIL", "1–2"],
      ],
    },
  };

  const filterChapters = (chapters) =>
    chapters.filter(([name]) =>
      name.toLowerCase().includes(search.toLowerCase())
    );

  const subjectData = syllabus[activeSubject];

  return (
    <div className="space-y-10">
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
