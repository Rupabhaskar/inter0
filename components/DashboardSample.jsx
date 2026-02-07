"use client";

import { useState } from "react";
import Image from "next/image";

const dashboardSampleSrc = "/dashboard-sample.png";

export default function DashboardSample() {
  const [showSample, setShowSample] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="text-center mb-12">
      <h3 className="text-2xl md:text-3xl font-bold text-[#0B1935] mb-3">
        College Dashboard
      </h3>
      <p className="text-slate-600 max-w-2xl mx-auto mb-6">
        JEE Mains • JEE Advanced • Institute Mock Analytics — all in one place for your college.
      </p>
      <button
        type="button"
        onClick={() => setShowSample((v) => !v)}
        className="inline-flex items-center justify-center px-6 py-3 bg-[#0B1935] text-white rounded-lg font-medium shadow hover:bg-[#0B1935]/90 transition"
      >
        {showSample ? "Hide Sample" : "Sample"}
      </button>

      {showSample && (
        <div className="mt-8 w-full max-w-5xl mx-auto">
          <p className="text-sm text-slate-500 mb-3">Dashboard preview</p>
          <div className="relative w-full rounded-lg overflow-hidden border border-slate-300 shadow-lg bg-white">
            <div className="relative w-full aspect-[16/10] min-h-[280px] bg-slate-100">
              {imgError ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm p-4">
                  Add <code className="bg-slate-200 px-1 rounded">dashboard-sample.png</code> to the <code className="bg-slate-200 px-1 rounded">public</code> folder to show the dashboard preview.
                </div>
              ) : (
                <Image
                  src={dashboardSampleSrc}
                  alt="College Dashboard sample – KPIs, performance, top performers, subject-wise scores"
                  fill
                  className="object-contain object-top"
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  unoptimized
                  onError={() => setImgError(true)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
