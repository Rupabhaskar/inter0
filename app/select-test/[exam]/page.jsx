import Link from "next/link";
import { questionsData } from "../../../data/questions";
import ProtectedRoute from "@/components/ProtectedRoute";


export default async function ExamPage({ params }) {
  const { exam } = await params; // ✅ FIX

  if (!exam || !questionsData[exam]) {
    return (
      <div className="text-center mt-10 text-red-500 font-semibold">
        Invalid Exam
      </div>
    );
  }

  const tests = Object.keys(questionsData[exam]);

  return (
    <ProtectedRoute>
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-2">
        {exam.replace("-", " ").toUpperCase()}
      </h2>

      <p className="text-slate-500 mb-6">Select a test</p>

      <div className="grid md:grid-cols-3 gap-6">
        {tests.map((test) => (
          <Link
            key={test}
            href={`/select-test/${exam}/${test}`}
            className="p-6 bg-white border rounded-lg hover:shadow transition"
          >
            <h3 className="font-semibold text-lg">
              {test.replace("-", " ").toUpperCase()}
            </h3>
            <p className="text-xs text-green-600 mt-3">Start Test</p>
          </Link>
        ))}
      </div>
    </div>
        </ProtectedRoute>
  );
}

