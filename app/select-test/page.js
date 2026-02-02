// import Link from "next/link";

// export default function SelectTestPage() {
//   return (
//     <div className="max-w-6xl mx-auto p-6">
//       <h2 className="text-2xl font-bold mb-2">Select Exam Type</h2>
//       <p className="text-slate-500 mb-6">Choose the exam you want to practice</p>

//       <div className="grid md:grid-cols-3 gap-6">
//         <Link
//           href="/select-test/jee-mains"
//           className="p-6 bg-white border rounded-lg hover:shadow transition"
//         >
//           <h3 className="font-semibold text-lg">JEE Mains</h3>
//           <p className="text-sm text-slate-500">Mock Tests</p>
//           <p className="text-xs text-green-600 mt-3">Available</p>
//         </Link>

//         <div className="p-6 bg-white border rounded-lg opacity-50">
//           <h3 className="font-semibold text-lg">JEE Advanced</h3>
//           <p className="text-xs text-red-500 mt-3">Coming Soon</p>
//         </div>
//       </div>
//     </div>
//   );
// }

import Link from "next/link";

export default function SelectTestPage() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-2">Select Exam Type</h2>
      <p className="text-slate-500 mb-6">Choose the exam you want to practice</p>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* JEE MAINS */}
        <Link
          href="/select-test/jee-mains"
          className="p-6 bg-white border rounded-lg hover:shadow transition"
        >
          <h3 className="font-semibold text-lg">JEE Mains</h3>
          <p className="text-sm text-slate-500">Mock Tests</p>
          <p className="text-xs text-green-600 mt-3">Available</p>
        </Link>

        {/* JEE ADVANCED */}
        <Link
          href="/select-test/jee-advanced"
          className="p-6 bg-white border rounded-lg hover:shadow transition"
        >
          <h3 className="font-semibold text-lg">JEE Advanced</h3>
          <p className="text-sm text-slate-500">Mock Tests</p>
          <p className="text-xs text-green-600 mt-3">Available</p>
        </Link>

        {/* EAMCET */}
        <Link
          href="/select-test/eamcet"
          className="p-6 bg-amber-50 border border-amber-200 rounded-lg hover:shadow transition"
        >
          <h3 className="font-semibold text-lg text-amber-800">EAMCET</h3>
          <p className="text-sm text-amber-600">Mock Tests</p>
          <p className="text-xs text-green-600 mt-3">Available</p>
        </Link>

        {/* COLLEGE TESTS */}
        <Link
          href="/select-test/college"
          className="p-6 bg-indigo-50 border border-indigo-200 rounded-lg hover:shadow transition"
        >
          <h3 className="font-semibold text-lg text-indigo-700">
            College Tests
          </h3>
          <p className="text-sm text-indigo-600">
            Internal Exams
          </p>
          <p className="text-xs text-green-600 mt-3">Available</p>
        </Link>

      </div>
    </div>
  );
}
