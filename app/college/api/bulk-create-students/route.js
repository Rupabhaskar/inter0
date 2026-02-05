import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function POST(req) {
  try {
    const { students, collegeAdminUid, college: collegeCode } = await req.json();
    const code = (collegeCode != null && String(collegeCode).trim() !== "")
      ? String(collegeCode).trim()
      : "_";

    const results = {
      created: [],
      skipped: [],
      failed: [],
    };

    for (const s of students) {
      try {
        // 🔐 Create Auth user
        const user = await adminAuth.createUser({
          email: s.Email,
          password: "Sample@123",
        });

        const studentData = {
          uid: user.uid,
          rollNumber: String(s.RollNumber),
          name: s.Name,
          email: s.Email,
          phone: s.Phone,
          course: s.Course,
          college: code,
          defaultPassword: true,
          createdAt: new Date(),
        };
        if (collegeAdminUid) {
          studentData.collegeAdminUid = collegeAdminUid;
        }
        // Schema: students/{collegeCode}/ids/{uid}
        await adminDb
          .collection("students")
          .doc(code)
          .collection("ids")
          .doc(user.uid)
          .set(studentData);

        results.created.push({
          rollNumber: s.RollNumber,
          email: s.Email,
        });
      } catch (err) {
        if (err.code === "auth/email-already-exists") {
          results.skipped.push({
            rollNumber: s.RollNumber,
            email: s.Email,
            reason: "Email already exists",
          });
        } else {
          results.failed.push({
            rollNumber: s.RollNumber,
            email: s.Email,
            reason: err.message,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Bulk upload failed" },
      { status: 500 }
    );
  }
}
