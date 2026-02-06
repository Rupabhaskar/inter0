"use client";

import PermissionRoute from "@/components/PermissionRoute";

function InsightsContent() {
  const letters = "Coming Soon".split("");
  // 3D extrusion: layered shadows for depth (back face)
  const depth = 8;
  const shadowLayers = Array.from({ length: depth }, (_, i) => {
    const n = i + 1;
    const c = 0.4 - (i * 0.04);
    return `${n}px ${n}px 0 rgba(30,41,59,${c})`;
  }).join(", ");
  const textShadow3D = `${shadowLayers}, 0 0 20px rgba(0,0,0,0.1)`;

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center px-4 py-20 bg-white">
      <div
        className="relative z-10 flex flex-wrap justify-center gap-1 md:gap-2"
        style={{ perspective: "800px" }}
      >
        {letters.map((char, i) => (
          <span
            key={i}
            className="inline-block text-3xl md:text-5xl lg:text-6xl font-black text-slate-700 tracking-tight"
            style={{
              fontFamily: "var(--font-ai), sans-serif",
              transform: `rotate(${(i % 3 - 1) * 3}deg) rotateX(15deg) rotateY(-5deg)`,
              transformStyle: "preserve-3d",
              textShadow: textShadow3D,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Insights() {
  return (
    <PermissionRoute requiredPermission="insights">
      <InsightsContent />
    </PermissionRoute>
  );
}
