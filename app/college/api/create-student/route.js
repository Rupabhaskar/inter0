// // import { adminAuth, adminDb } from "../../../../lib/firebaseAdmin";
// // import { NextResponse } from "next/server";

// // export async function POST(req) {
// //   try {
// //     const { name, email, phone, course,rollNumber } = await req.json();

// //     const defaultPassword = "Sample@123";

// //     // Create Auth user (NO logout)
// //     const user = await adminAuth.createUser({
// //       email,
// //       password: defaultPassword,
// //     });

// //     // Save student to Firestore
// //     await adminDb.collection("students").add({
// //       uid: user.uid,
// //       name,
// //       email,
// //       phone,
// //       course,
// //       rollNumber,
// //       defaultPassword: true,
// //       createdAt: new Date(),
// //     });

// //     return NextResponse.json({ success: true });
// //   } catch (error) {
// //     return NextResponse.json(
// //       { error: error.message },
// //       { status: 400 }
// //     );
// //   }
// // }


// import { adminAuth, adminDb } from "../../../../lib/firebaseAdmin";
// import { NextResponse } from "next/server";
// import bcrypt from "bcryptjs";

// export async function POST(req) {
//   try {
//     const { name, email, phone, course, rollNumber } = await req.json();

//     const defaultPassword = "Sample@123";

//     // Create Auth user
//     const user = await adminAuth.createUser({
//       email,
//       password: defaultPassword,
//     });

//     // Hash password (optional but safe)
//     const passwordHash = await bcrypt.hash(defaultPassword, 10);

//     await adminDb.collection("students").add({
//       uid: user.uid,
//       name,
//       email,
//       phone,
//       course,
//       rollNumber,
//       passwordHash,
//       defaultPassword: true,
//       createdAt: new Date(),
//     });

//     return NextResponse.json({ success: true });
//   } catch (error) {
//     return NextResponse.json(
//       { error: error.message },
//       { status: 500 }
//     );
//   }
// }

export const runtime = "nodejs";

import { adminAuth, adminDb } from "../../../../lib/firebaseAdmin";
import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";

const FALLBACK_PASSWORD = "Sample@123";

async function getCollegeStudentDefaultPassword(collegeAdminUid) {
  if (!collegeAdminUid) return FALLBACK_PASSWORD;
  const adminSnap = await adminDb.collection("users").doc(collegeAdminUid).get();
  const pw = adminSnap.exists() ? adminSnap.data().collegeStudentDefaultPassword : null;
  return (pw != null && String(pw).trim() !== "") ? String(pw).trim() : FALLBACK_PASSWORD;
}

export async function POST(req) {
  try {
    const { name, email, phone, course, rollNumber, collegeAdminUid, college } = await req.json();

    const defaultPassword = await getCollegeStudentDefaultPassword(collegeAdminUid);
    const collegeCode = (college != null && String(college).trim() !== "")
      ? String(college).trim()
      : "_";

    // Create Firebase Auth user with college's default password
    const user = await adminAuth.createUser({
      email,
      password: defaultPassword,
    });

    // Hash password (server-only)
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const studentData = {
      uid: user.uid,
      name,
      email,
      phone,
      course,
      rollNumber,
      college: collegeCode,
      passwordHash: hashedPassword,
      defaultPassword: true,
      createdAt: new Date(),
    };
    if (collegeAdminUid) {
      studentData.collegeAdminUid = collegeAdminUid;
    }

    // Schema: students/{collegeCode}/ids/{uid}
    await adminDb
      .collection("students")
      .doc(collegeCode)
      .collection("ids")
      .doc(user.uid)
      .set(studentData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
