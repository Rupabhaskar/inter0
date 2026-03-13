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
            className="inline-block text-3xl md:text-5xl lg:text-6xl font-black text-slate-700 tracking-tight wave-letter"
            style={{
              fontFamily: "var(--font-ai), sans-serif",
              textShadow: textShadow3D,
              animationDelay: `${i * 0.12}s`,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </div>
      <style jsx>{`
        @keyframes wave-letter {
          0% {
            transform: translateY(0) rotateX(15deg) rotateY(-5deg);
            filter: drop-shadow(0 4px 8px rgba(15, 23, 42, 0.2));
          }
          25% {
            transform: translateY(-10px) rotateX(22deg) rotateY(-10deg) scale(1.03);
            filter: drop-shadow(0 10px 16px rgba(15, 23, 42, 0.25));
          }
          50% {
            transform: translateY(6px) rotateX(10deg) rotateY(-2deg) scale(0.99);
            filter: drop-shadow(0 3px 6px rgba(15, 23, 42, 0.18));
          }
          75% {
            transform: translateY(-4px) rotateX(18deg) rotateY(-7deg) scale(1.02);
            filter: drop-shadow(0 8px 14px rgba(15, 23, 42, 0.22));
          }
          100% {
            transform: translateY(0) rotateX(15deg) rotateY(-5deg);
            filter: drop-shadow(0 4px 8px rgba(15, 23, 42, 0.2));
          }
        }

        .wave-letter {
          transform-style: preserve-3d;
          animation: wave-letter 2s ease-in-out infinite;
        }
      `}</style>
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
