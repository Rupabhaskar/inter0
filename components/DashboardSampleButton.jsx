"use client";

import { useState } from "react";
import Image from "next/image";

export default function DashboardSampleButton() {
  const [showSample, setShowSample] = useState(false);

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => setShowSample((prev) => !prev)}
        className="inline-flex items-center justify-center px-6 py-3 bg-[#0B1935] text-white rounded-lg font-medium shadow hover:bg-[#0B1935]/90 transition"
      >
        {showSample ? "Hide sample" : "View sample"}
      </button>

      {showSample && (
        <div className="mt-8 w-full max-w-4xl mx-auto">
          <div className="relative w-full rounded-lg overflow-hidden border border-slate-200 shadow-lg bg-white">
            <div className="relative w-full aspect-[16/10] min-h-[280px]">
              <Image
                src="/dashboard-sample.png"
                alt="College Dashboard sample – KPIs, performance analysis, top performers, subject-wise scores"
                fill
                className="object-contain object-top"
                sizes="(max-width: 896px) 100vw, 896px"
                unoptimized
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
