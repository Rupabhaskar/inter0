"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function CollegeTestsPage() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadTests = async () => {
      try {
        const snap = await getDocs(collection(db, "tests"));

        const data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setTests(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadTests();
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500">
        Loading College Tests...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-2">College Tests</h2>
      <p className="text-slate-500 mb-6">
        Select a test to start
      </p>

      {tests.length === 0 ? (
        <p className="text-red-500">No tests found</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {tests.map((test) => (
            <div
              key={test.id}
              onClick={() =>
                router.push(`/select-test/college/${test.id}`)
              }
              className="cursor-pointer p-6 bg-white border rounded-lg hover:shadow-lg transition"
            >
              <h3 className="font-semibold text-lg">
                {test.name}
              </h3>

              <p className="text-sm text-slate-500 mt-2">
                Duration: {test.duration} minutes
              </p>

              <p className="text-xs text-green-600 mt-3">
                Click to start
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
