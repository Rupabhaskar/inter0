"use client";

export default function ApEamcetSyllabus({
  activeSubject = "Mathematics",
  search = "",
}) {
  const syllabus = {
    Mathematics: {
      class11: [
        ["Functions", "1"],
        ["Mathematical Induction", "1"],
        ["Complex Numbers", "2"],
        ["Quadratic Expressions", "1"],
        ["Theory of Equations", "1"],
        ["Permutations & Combinations", "1–2"],
        ["Binomial Theorem", "1–2"],
        ["Partial Fractions", "1"],
        ["Sequences & Series", "2"],
        ["Straight Lines", "1"],
        ["Pair of Straight Lines", "1"],
        ["Circles", "1–2"],
        ["System of Circles", "1"],
        ["Parabola", "1–2"],
        ["Ellipse", "1"],
        ["Hyperbola", "1"],
        ["Limits & Continuity", "1–2"],
        ["Differentiation", "2"],
      ],
      class12: [
        ["Applications of Derivatives", "2–3"],
        ["Integrals", "2–3"],
        ["Definite Integrals", "2"],
        ["Differential Equations", "1"],
        ["Vector Algebra", "2"],
        ["3D Geometry", "2–3"],
        ["Probability", "2"],
        ["Statistics", "1"],
        ["Trigonometric Equations", "1"],
        ["Inverse Trigonometric Functions", "1"],
        ["Matrices", "1–2"],
        ["Determinants", "1–2"],
      ],
    },

    Physics: {
      class11: [
        ["Physical World & Units", "1"],
        ["Motion in a Straight Line", "1"],
        ["Motion in a Plane", "1–2"],
        ["Laws of Motion", "2"],
        ["Work, Energy & Power", "2"],
        ["Centre of Mass & Rotation", "2–3"],
        ["Gravitation", "1"],
        ["Properties of Solids", "1"],
        ["Properties of Fluids", "1"],
        ["Thermal Properties of Matter", "1"],
        ["Thermodynamics", "2"],
        ["Kinetic Theory of Gases", "1"],
        ["Oscillations", "1"],
        ["Waves", "1"],
      ],
      class12: [
        ["Electrostatics", "2–3"],
        ["Capacitance", "1"],
        ["Current Electricity", "2"],
        ["Magnetic Effects of Current", "2"],
        ["Electromagnetic Induction", "1–2"],
        ["Alternating Current", "1"],
        ["Electromagnetic Waves", "1"],
        ["Ray Optics", "2"],
        ["Wave Optics", "1"],
        ["Dual Nature of Radiation", "1"],
        ["Atoms", "1"],
        ["Nuclei", "1"],
        ["Semiconductors", "2"],
      ],
    },

    Chemistry: {
      class11: [
        ["Basic Concepts of Chemistry", "1–2"],
        ["Atomic Structure", "1"],
        ["Classification of Elements", "1"],
        ["Chemical Bonding", "2–3"],
        ["States of Matter", "1"],
        ["Thermodynamics", "2"],
        ["Chemical Equilibrium", "1–2"],
        ["Ionic Equilibrium", "1–2"],
        ["Redox Reactions", "1"],
        ["Hydrogen & s-Block Elements", "1"],
        ["p-Block Elements (Group 13–14)", "1"],
        ["Organic Chemistry – Basics (GOC)", "2–3"],
        ["Hydrocarbons", "1–2"],
      ],
      class12: [
        ["Solid State", "1"],
        ["Solutions", "1"],
        ["Electrochemistry", "2"],
        ["Chemical Kinetics", "1–2"],
        ["Surface Chemistry", "1"],
        ["p-Block Elements (15–18)", "1–2"],
        ["d & f Block Elements", "1–2"],
        ["Coordination Compounds", "2–3"],
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
