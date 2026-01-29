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

export async function POST(req) {
  try {
    const { name, email, phone, course, rollNumber, collegeAdminUid } = await req.json();

    const defaultPassword = "Sample@123";

    // Create Firebase Auth user
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
      passwordHash: hashedPassword,
      defaultPassword: true,
      createdAt: new Date(),
    };
    if (collegeAdminUid) {
      studentData.collegeAdminUid = collegeAdminUid;
    }
    await adminDb.collection("students").add(studentData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
