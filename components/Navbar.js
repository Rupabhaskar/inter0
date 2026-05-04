"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { collection, collectionGroup, doc, getDoc, getDocs, query, where, limit } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

// 🔥 ICONS
import {
  LayoutDashboard,
  BookOpen,
  User,
  LogOut,
  Menu,
  MessageSquare,
  X,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collegeName, setCollegeName] = useState(null);
  const [collegeLogoUrl, setCollegeLogoUrl] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactErrors, setContactErrors] = useState({});
  const [contactStatus, setContactStatus] = useState({ type: "", message: "" });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({
    type: "student",
    name: "",
    email: "",
    phone: "",
    collegeName: "",
    courseOrClass: "",
    message: "",
  });

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  /* Resolve college name + logo for logged-in users (students + college admin/user) – show in navbar */
  useEffect(() => {
    if (!user?.uid) {
      queueMicrotask(() => {
        setCollegeName(null);
        setCollegeLogoUrl(null);
      });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // College admin: name + logo from own user doc
        if (role === "collegeAdmin") {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (cancelled) return;
          const data = snap.exists() ? snap.data() : {};
          setCollegeName(data.collegeName || data.name || data.email || data.collegeShort || null);
          setCollegeLogoUrl(data.logoUrl || null);
          return;
        }
        // College user: name + logo from linked admin's user doc
        if (role === "collegeuser") {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (cancelled) return;
          const data = snap.exists() ? snap.data() : {};
          const adminUid = data.collegeAdminUid;
          if (!adminUid) {
            setCollegeName(null);
            setCollegeLogoUrl(null);
            return;
          }
          const adminSnap = await getDoc(doc(db, "users", adminUid));
          if (cancelled) return;
          const adminData = adminSnap.exists() ? adminSnap.data() : {};
          setCollegeName(adminData.collegeName || adminData.name || adminData.email || adminData.collegeShort || null);
          setCollegeLogoUrl(adminData.logoUrl || null);
          return;
        }
        // Student: resolve college code then fetch admin doc for name + logo
        let collegeCode = null;
        try {
          const q = query(
            collectionGroup(db, "ids"),
            where("uid", "==", user.uid),
            limit(1)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const docRef = snap.docs[0].ref;
            collegeCode = docRef.parent.parent.id;
            const data = snap.docs[0].data();
            if (data.college != null && String(data.college).trim() !== "")
              collegeCode = String(data.college).trim();
          }
        } catch (_) {
          const collegesSnap = await getDocs(
            query(collection(db, "users"), where("role", "==", "collegeAdmin"))
          );
          const codes = new Set(["_"]);
          collegesSnap.docs.forEach((d) => {
            const c = d.data().collegeShort;
            if (c) codes.add(String(c).trim());
          });
          for (const code of codes) {
            const studentSnap = await getDoc(doc(db, "students", code, "ids", user.uid));
            if (studentSnap.exists()) {
              collegeCode = studentSnap.data().college != null ? String(studentSnap.data().college).trim() : code;
              if (!collegeCode) collegeCode = code;
              break;
            }
          }
        }
        if (cancelled || !collegeCode) {
          setCollegeName(null);
          setCollegeLogoUrl(null);
          return;
        }
        const adminSnap = await getDocs(
          query(
            collection(db, "users"),
            where("role", "==", "collegeAdmin"),
            where("collegeShort", "==", collegeCode),
            limit(1)
          )
        );
        if (cancelled) return;
        if (adminSnap.empty) {
          setCollegeName(collegeCode);
          setCollegeLogoUrl(null);
        } else {
          const adminData = adminSnap.docs[0].data();
          setCollegeName(adminData.collegeName || adminData.name || adminData.email || collegeCode);
          setCollegeLogoUrl(adminData.logoUrl || null);
        }
      } catch (_) {
        if (!cancelled) {
          setCollegeName(null);
          setCollegeLogoUrl(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid, role]);

  // Hide navbar on home, test routes, and when taking an exam (college test or exam test)
  const isTakingExam =
    pathname.startsWith("/select-test/") &&
    pathname.split("/").filter(Boolean).length >= 3; // e.g. /select-test/college/[testId] or /select-test/[exam]/[test]
  const hideNavbar =
    pathname === "/" || pathname.startsWith("/test") || isTakingExam;
  const loginOnlyLogo = pathname === "/login" || pathname === "/college";
  const isCollegeDashboard = pathname.startsWith("/college/dashboard");
  const isBlogPage = pathname === "/blog" || pathname.startsWith("/blog/");
  const isSampleQBPage = pathname === "/sampleQB";
  const isContactOnlyNavbar = isBlogPage || isSampleQBPage;

  // Login page: show only Ranksprint logo (zoomed), no menu
  if (mounted && loginOnlyLogo) {
    return (
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-center">
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/Ranksprint.png"
              alt="RankSprint logo – Inter JEE mock test and EAMCET mock test platform"
              width={320}
              height={96}
              className="h-20 md:h-28 w-auto object-contain scale-110 md:scale-155"
              priority
            />
          </Link>
        </div>
      </nav>
    );
  }

  if (!mounted || hideNavbar) return null;

  async function handleLogout() {
    await signOut(auth);
    router.push("/");
  }

  function handleContactInputChange(event) {
    const { name, value } = event.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
    setContactErrors((prev) => ({ ...prev, [name]: "" }));
    setContactStatus({ type: "", message: "" });
  }

  function validateContactForm() {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneDigits = (contactForm.phone || "").replace(/\D/g, "");

    if (!contactForm.name.trim()) errors.name = "Name is required";
    if (!emailRegex.test(contactForm.email.trim())) errors.email = "Valid email is required";
    if (phoneDigits.length < 10) errors.phone = "Valid phone number is required";
    if (!contactForm.message.trim()) errors.message = "Message is required";
    if (contactForm.type === "college" && !contactForm.collegeName.trim()) {
      errors.collegeName = "College name is required";
    }
    if (contactForm.type === "student" && !contactForm.courseOrClass.trim()) {
      errors.courseOrClass = "Class/Course is required";
    }

    return errors;
  }

  async function handleContactSubmit(event) {
    event.preventDefault();
    setContactStatus({ type: "", message: "" });
    const errors = validateContactForm();
    if (Object.keys(errors).length > 0) {
      setContactErrors(errors);
      return;
    }

    setContactSubmitting(true);
    try {
      const response = await fetch("/api/contact-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data?.fieldErrors) setContactErrors(data.fieldErrors);
        throw new Error(data?.error || "Failed to submit contact form");
      }

      setContactErrors({});
      setContactForm({
        type: "student",
        name: "",
        email: "",
        phone: "",
        collegeName: "",
        courseOrClass: "",
        message: "",
      });
      setContactStatus({
        type: "success",
        message:
          data?.message ||
          (data?.mailSent
            ? "Thanks for contacting RankSprint. Your details are saved and we will respond within 24 hours."
            : "Thanks for contacting RankSprint. Your details are saved, but email is not configured yet."),
      });
    } catch (error) {
      setContactStatus({
        type: "error",
        message: error?.message || "Something went wrong while submitting the form.",
      });
    } finally {
      setContactSubmitting(false);
    }
  }

  const linkClass = (href) =>
    `flex items-center gap-2.5 px-4 py-2.5 rounded-md text-base font-medium transition ${
      pathname === href
        ? "bg-blue-600 text-white"
        : "text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <nav className="bg-white border-b border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 h-20 md:h-24 flex items-center justify-between gap-4 min-h-0">
        {/* On college dashboard: RankSprint only. Else: college logo + name when set, else RankSprint */}
        <div className="flex items-center gap-3 shrink-0 min-w-0">
          {collegeLogoUrl && !isCollegeDashboard ? (
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded-full w-16 h-16 md:w-20 md:h-20 overflow-hidden border-2 border-white shadow-lg bg-white shrink-0 ring-2 ring-slate-200"
                title={collegeName || "College partner"}
              >
              {collegeLogoUrl.includes("cloudinary.com") ? (
                <Image
                  src={collegeLogoUrl}
                  alt={collegeName || "College logo"}
                  width={96}
                  height={96}
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={collegeLogoUrl}
                    alt={collegeName || "College logo"}
                    className="h-full w-full object-contain p-1.5"
                  />
                </>
              )}
              </div>
            </div>
          ) : (
            <Link href="/" className="flex items-center shrink-0 max-h-full py-1">
              <Image
                src="/Ranksprint.png"
                alt="RankSprint logo – Inter JEE mock test and EAMCET mock test platform"
                width={320}
                height={96}
                className="h-16 md:h-24 w-auto max-h-full object-contain object-left scale-110 md:scale-125"
                priority
              />
            </Link>
          )}
          {collegeName && !isCollegeDashboard && (
            <span className="hidden sm:inline text-slate-600 text-sm md:text-base font-medium border-l border-slate-300 pl-3 truncate max-w-[280px] md:max-w-[320px]" title={`${collegeName} | RankSprint`}>
              {collegeName} <span className="text-slate-400">|</span> RankSprint
            </span>
          )}
        </div>

        {isContactOnlyNavbar ? (
          <button
            onClick={() => setShowContactForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm md:text-base font-medium bg-blue-600 text-white hover:bg-blue-700 transition shrink-0"
          >
            <MessageSquare size={18} />
            Contact Form
          </button>
        ) : (
          <>
            {/* DESKTOP MENU - zoomed / larger */}
            <div className="hidden md:flex items-center gap-1 shrink-0">
              <Link href="/dashboard" className={linkClass("/dashboard")}>
                <LayoutDashboard size={22} />
                Dashboard
              </Link>

              <Link href="/select-test" className={linkClass("/select-test")}>
                <BookOpen size={22} />
                Exams
              </Link>

              <Link href="/profile" className={linkClass("/profile")}>
                <User size={22} />
                Profile
              </Link>

              {user && (
                <button
                  onClick={handleLogout}
                  className="ml-2 flex items-center gap-2 px-4 py-2.5 rounded text-base font-medium bg-red-500 text-white hover:bg-red-600 transition"
                >
                  <LogOut size={20} />
                  Logout
                </button>
              )}
            </div>

            {/* MOBILE MENU BUTTON */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2.5 rounded border shrink-0"
            >
              <Menu size={24} />
            </button>
          </>
        )}
      </div>

      {/* MOBILE MENU */}
      {menuOpen && !isContactOnlyNavbar && (
        <div className="md:hidden bg-white border-t border-slate-200">
          {(collegeLogoUrl || collegeName) && !isCollegeDashboard && (
            <div className="px-4 py-3 flex items-center gap-3 text-slate-600 text-sm font-medium border-b border-slate-100">
              {collegeLogoUrl && (
                <div className="flex items-center justify-center rounded-full w-14 h-14 overflow-hidden border-2 border-slate-200 shadow bg-white shrink-0">
                  {collegeLogoUrl.includes("cloudinary.com") ? (
                    <Image src={collegeLogoUrl} alt="" width={56} height={56} className="h-full w-full object-contain p-1" />
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={collegeLogoUrl} alt="" className="h-full w-full object-contain p-1" />
                    </>
                  )}
                </div>
              )}
              {collegeName && <span>In collaboration with {collegeName} | RankSprint</span>}
            </div>
          )}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-3"
            onClick={() => setMenuOpen(false)}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </Link>

          <Link
            href="/select-test"
            className="flex items-center gap-2 px-4 py-3"
            onClick={() => setMenuOpen(false)}
          >
            <BookOpen size={18} />
            Exams
          </Link>

          <Link
            href="/profile"
            className="flex items-center gap-2 px-4 py-3"
            onClick={() => setMenuOpen(false)}
          >
            <User size={18} />
            Profile
          </Link>

          {user && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-3 text-red-600 font-medium hover:bg-red-50"
            >
              <LogOut size={18} />
              Logout
            </button>
          )}
        </div>
      )}

      {showContactForm && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Contact Form</h2>
              <button
                type="button"
                onClick={() => {
                  setShowContactForm(false);
                  setContactErrors({});
                  setContactStatus({ type: "", message: "" });
                }}
                className="text-slate-500 hover:text-slate-700"
                aria-label="Close contact form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">I am a</label>
                <select
                  name="type"
                  value={contactForm.type}
                  onChange={handleContactInputChange}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="student">Student</option>
                  <option value="college">College</option>
                </select>
              </div>

              <div>
                <input
                  name="name"
                  value={contactForm.name}
                  onChange={handleContactInputChange}
                  placeholder="Full Name"
                  className="w-full border rounded-lg px-3 py-2"
                />
                {contactErrors.name && <p className="text-xs text-red-600 mt-1">{contactErrors.name}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <input
                    name="email"
                    type="email"
                    value={contactForm.email}
                    onChange={handleContactInputChange}
                    placeholder="Email"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  {contactErrors.email && <p className="text-xs text-red-600 mt-1">{contactErrors.email}</p>}
                </div>
                <div>
                  <input
                    name="phone"
                    value={contactForm.phone}
                    onChange={handleContactInputChange}
                    placeholder="Phone Number"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  {contactErrors.phone && <p className="text-xs text-red-600 mt-1">{contactErrors.phone}</p>}
                </div>
              </div>

              {contactForm.type === "college" ? (
                <div>
                  <input
                    name="collegeName"
                    value={contactForm.collegeName}
                    onChange={handleContactInputChange}
                    placeholder="College Name"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  {contactErrors.collegeName && (
                    <p className="text-xs text-red-600 mt-1">{contactErrors.collegeName}</p>
                  )}
                </div>
              ) : (
                <div>
                  <input
                    name="courseOrClass"
                    value={contactForm.courseOrClass}
                    onChange={handleContactInputChange}
                    placeholder="Class / Course"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  {contactErrors.courseOrClass && (
                    <p className="text-xs text-red-600 mt-1">{contactErrors.courseOrClass}</p>
                  )}
                </div>
              )}

              <div>
                <textarea
                  name="message"
                  value={contactForm.message}
                  onChange={handleContactInputChange}
                  placeholder="Your message"
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2"
                />
                {contactErrors.message && <p className="text-xs text-red-600 mt-1">{contactErrors.message}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowContactForm(false);
                    setContactErrors({});
                    setContactStatus({ type: "", message: "" });
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {contactSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
              {contactStatus.message && (
                <p
                  className={`text-sm ${
                    contactStatus.type === "success" ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {contactStatus.message}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}



// "use client";

// import Link from "next/link";
// import { usePathname, useRouter } from "next/navigation";
// import { useEffect, useState } from "react";
// import { signOut } from "firebase/auth";
// import { auth } from "@/lib/firebase";
// import { useAuth } from "@/components/AuthProvider";

// export default function Navbar() {
//   const pathname = usePathname();
//   const router = useRouter();
//   const { user } = useAuth();

//   const [mounted, setMounted] = useState(false);
//   const [dark, setDark] = useState(false);
//   const [menuOpen, setMenuOpen] = useState(false);

//   useEffect(() => {
//     setMounted(true);
//     const theme = localStorage.getItem("theme");
//     if (theme === "dark") {
//       document.documentElement.classList.add("dark");
//       setDark(true);
//     }
//   }, []);

//   const hideNavbar =
//     pathname === "/" || pathname.startsWith("/test");

//   if (!mounted || hideNavbar) return null;

//   function toggleTheme() {
//     if (dark) {
//       document.documentElement.classList.remove("dark");
//       localStorage.setItem("theme", "light");
//     } else {
//       document.documentElement.classList.add("dark");
//       localStorage.setItem("theme", "dark");
//     }
//     setDark(!dark);
//   }

//   async function handleLogout() {
//     await signOut(auth);
//     router.push("/");
//   }

//   const linkClass = (href) =>
//     `px-3 py-2 rounded text-sm font-medium ${
//       pathname === href
//         ? "bg-blue-600 text-white"
//         : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
//     }`;

//   return (
//     <nav className="bg-white dark:bg-slate-900 border-b dark:border-slate-700">
//       <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
//         <Link href="/dashboard" className="font-bold">
//           JEE Practice
//         </Link>

//         {/* Desktop menu */}
//         <div className="hidden md:flex items-center gap-2">
//           <Link href="/dashboard" className={linkClass("/dashboard")}>
//             Dashboard
//           </Link>
//           <Link href="/select-test" className={linkClass("/select-test")}>
//             Exams
//           </Link>
//           <Link href="/profile" className={linkClass("/profile")}>
//             Profile
//           </Link>

//           {/* LOGOUT */}
//           {user && (
//             <button
//               onClick={handleLogout}
//               className="ml-2 px-3 py-2 rounded text-sm font-medium bg-red-500 text-white hover:bg-red-600"
//             >
//               Logout
//             </button>
//           )}
//         </div>

//         {/* Right controls */}
//         <div className="flex items-center gap-2">
//           <button
//             onClick={toggleTheme}
//             className="px-2 py-1 border rounded dark:border-slate-600"
//           >
//             {dark ? "🌙" : "☀️"}
//           </button>

//           <button
//             onClick={() => setMenuOpen(!menuOpen)}
//             className="md:hidden px-2 py-1 border rounded dark:border-slate-600"
//           >
//             ☰
//           </button>
//         </div>
//       </div>

//       {/* Mobile menu */}
//       {menuOpen && (
//         <div className="md:hidden bg-white dark:bg-slate-900 border-t dark:border-slate-700">
//           <Link href="/dashboard" className="block px-4 py-2">
//             Dashboard
//           </Link>
//           <Link href="/select-test" className="block px-4 py-2">
//             Exams
//           </Link>
//           <Link href="/profile" className="block px-4 py-2">
//             Profile
//           </Link>

//           {user && (
//             <button
//               onClick={handleLogout}
//               className="block w-full text-left px-4 py-2 text-red-600 font-medium hover:bg-red-50 dark:hover:bg-slate-800"
//             >
//               Logout
//             </button>
//           )}
//         </div>
//       )}
//     </nav>
//   );
// }



// // // "use client";

// // // import Link from "next/link";
// // // import { usePathname } from "next/navigation";
// // // import { useEffect, useState } from "react";

// // // export default function Navbar() {
// // //   const pathname = usePathname();

// // //   const [mounted, setMounted] = useState(false);
// // //   const [dark, setDark] = useState(false);
// // //   const [menuOpen, setMenuOpen] = useState(false);

// // //   // ✅ ALL HOOKS CALLED UNCONDITIONALLY
// // //   useEffect(() => {
// // //     setMounted(true);
// // //     const theme = localStorage.getItem("theme");
// // //     if (theme === "dark") {
// // //       document.documentElement.classList.add("dark");
// // //       setDark(true);
// // //     }
// // //   }, []);

// // //   // ✅ Decide visibility AFTER hooks
// // //   const hideNavbar =
// // //     pathname === "/" || pathname.startsWith("/test");

// // //   if (!mounted || hideNavbar) return null;

// // //   function toggleTheme() {
// // //     if (dark) {
// // //       document.documentElement.classList.remove("dark");
// // //       localStorage.setItem("theme", "light");
// // //     } else {
// // //       document.documentElement.classList.add("dark");
// // //       localStorage.setItem("theme", "dark");
// // //     }
// // //     setDark(!dark);
// // //   }

// // //   const linkClass = (href) =>
// // //     `px-3 py-2 rounded text-sm font-medium ${
// // //       pathname === href
// // //         ? "bg-blue-600 text-white"
// // //         : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
// // //     }`;

// // //   return (
// // //     <nav className="bg-white dark:bg-slate-900 border-b dark:border-slate-700">
// // //       <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
// // //         <Link href="/dashboard" className="font-bold">
// // //           JEE Practice
// // //         </Link>

// // //         {/* Desktop menu */}
// // //         <div className="hidden md:flex items-center gap-2">
// // //           <Link href="/dashboard" className={linkClass("/dashboard")}>
// // //             Dashboard
// // //           </Link>
// // //           <Link href="/select-test" className={linkClass("/select-test")}>
// // //             Exams
// // //           </Link>
// // //           <Link href="/profile" className={linkClass("/profile")}>
// // //             Profile
// // //           </Link>
// // //         </div>

// // //         {/* Right controls */}
// // //         <div className="flex items-center gap-2">
// // //           <button
// // //             onClick={toggleTheme}
// // //             className="px-2 py-1 border rounded dark:border-slate-600"
// // //           >
// // //             {dark ? "🌙" : "☀️"}
// // //           </button>

// // //           <button
// // //             onClick={() => setMenuOpen(!menuOpen)}
// // //             className="md:hidden px-2 py-1 border rounded dark:border-slate-600"
// // //           >
// // //             ☰
// // //           </button>
// // //         </div>
// // //       </div>

// // //       {/* Mobile menu */}
// // //       {menuOpen && (
// // //         <div className="md:hidden bg-white dark:bg-slate-900 border-t dark:border-slate-700">
// // //           <Link href="/dashboard" className="block px-4 py-2">
// // //             Dashboard
// // //           </Link>
// // //           <Link href="/select-test" className="block px-4 py-2">
// // //             Exams
// // //           </Link>
// // //           <Link href="/profile" className="block px-4 py-2">
// // //             Profile
// // //           </Link>
// // //         </div>
// // //       )}
// // //     </nav>
// // //   );
// // // }

// // // // "use client";

// // // // import Link from "next/link";
// // // // import { usePathname } from "next/navigation";
// // // // import { useEffect, useState } from "react";

// // // // export default function Navbar() {
// // // //   const pathname = usePathname();
// // // //   const [menuOpen, setMenuOpen] = useState(false);
// // // //   const [dark, setDark] = useState(false);

// // // //   // Hide navbar on exam page
// // // //   if (pathname.startsWith("/test")) return null;

// // // //   if (pathname === "/" || pathname.startsWith("/test")) {
// // // //   return null;
// // // // }

// // // //   // Load theme
// // // //   useEffect(() => {
// // // //     const saved = localStorage.getItem("theme");
// // // //     if (saved === "dark") {
// // // //       document.documentElement.classList.add("dark");
// // // //       setDark(true);
// // // //     }
// // // //   }, []);

// // // //   function toggleTheme() {
// // // //     if (dark) {
// // // //       document.documentElement.classList.remove("dark");
// // // //       localStorage.setItem("theme", "light");
// // // //     } else {
// // // //       document.documentElement.classList.add("dark");
// // // //       localStorage.setItem("theme", "dark");
// // // //     }
// // // //     setDark(!dark);
// // // //   }

// // // //   const navLink = (href, label) => (
// // // //     <Link
// // // //       href={href}
// // // //       onClick={() => setMenuOpen(false)}
// // // //       className={`block px-4 py-2 rounded ${
// // // //         pathname === href
// // // //           ? "bg-blue-600 text-white"
// // // //           : "hover:bg-slate-100 dark:hover:bg-slate-700"
// // // //       }`}
// // // //     >
// // // //       {label}
// // // //     </Link>
// // // //   );

// // // //   return (
// // // //     <nav className="bg-white dark:bg-slate-900 border-b dark:border-slate-700">
// // // //       <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
// // // //         {/* Logo */}
// // // //         <Link href="/dashboard" className="font-bold text-lg">
// // // //           JEE Practice
// // // //         </Link>

// // // //         {/* Desktop Menu */}
// // // //         <div className="hidden md:flex items-center gap-2">
// // // //           {navLink("/dashboard", "Dashboard")}
// // // //           {navLink("/select-test", "Exams")}
// // // //           {navLink("/profile", "Profile")}
// // // //         </div>

// // // //         {/* Right Controls */}
// // // //         <div className="flex items-center gap-2">
// // // //           {/* Dark Mode */}
// // // //           <button
// // // //             onClick={toggleTheme}
// // // //             className="px-2 py-1 text-sm border rounded"
// // // //           >
// // // //             {dark ? "🌙" : "☀️"}
// // // //           </button>

// // // //           {/* Hamburger */}
// // // //           <button
// // // //             className="md:hidden px-2 py-1 border rounded"
// // // //             onClick={() => setMenuOpen(!menuOpen)}
// // // //           >
// // // //             ☰
// // // //           </button>
// // // //         </div>
// // // //       </div>

// // // //       {/* Mobile Menu */}
// // // //       {menuOpen && (
// // // //         <div className="md:hidden border-t dark:border-slate-700">
// // // //           {navLink("/dashboard", "Dashboard")}
// // // //           {navLink("/select-test", "Exams")}
// // // //           {navLink("/profile", "Profile")}
// // // //         </div>
// // // //       )}
// // // //     </nav>
// // // //   );
// // // // }





// // // // // "use client";

// // // // // import Link from "next/link";
// // // // // import { usePathname } from "next/navigation";
// // // // // import { useEffect, useState } from "react";

// // // // // export default function Navbar() {
// // // // //   const pathname = usePathname();
// // // // //   const [mounted, setMounted] = useState(false);
// // // // //   const [dark, setDark] = useState(false);
// // // // //   const [menuOpen, setMenuOpen] = useState(false);

// // // // //   // Hide navbar during exam
// // // // //   if (pathname.startsWith("/test")) return null;

// // // // //   // Ensure client-only rendering
// // // // //   useEffect(() => {
// // // // //     setMounted(true);
// // // // //     const theme = localStorage.getItem("theme");
// // // // //     if (theme === "dark") {
// // // // //       document.documentElement.classList.add("dark");
// // // // //       setDark(true);
// // // // //     }
// // // // //   }, []);

// // // // //   if (!mounted) return null;

// // // // //   function toggleTheme() {
// // // // //     if (dark) {
// // // // //       document.documentElement.classList.remove("dark");
// // // // //       localStorage.setItem("theme", "light");
// // // // //     } else {
// // // // //       document.documentElement.classList.add("dark");
// // // // //       localStorage.setItem("theme", "dark");
// // // // //     }
// // // // //     setDark(!dark);
// // // // //   }

// // // // //   const linkClass = (href) =>
// // // // //     `px-3 py-2 rounded text-sm font-medium ${
// // // // //       pathname === href
// // // // //         ? "bg-blue-600 text-white"
// // // // //         : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
// // // // //     }`;

// // // // //   return (
// // // // //     <nav className="bg-white dark:bg-slate-900 border-b dark:border-slate-700">
// // // // //       <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
// // // // //         <Link href="/dashboard" className="font-bold">
// // // // //           JEE Practice
// // // // //         </Link>

// // // // //         {/* Desktop */}
// // // // //         <div className="hidden md:flex items-center gap-2">
// // // // //           <Link href="/dashboard" className={linkClass("/dashboard")}>
// // // // //             Dashboard
// // // // //           </Link>
// // // // //           <Link href="/select-test" className={linkClass("/select-test")}>
// // // // //             Exams
// // // // //           </Link>
// // // // //           <Link href="/profile" className={linkClass("/profile")}>
// // // // //             Profile
// // // // //           </Link>
// // // // //         </div>

// // // // //         <div className="flex items-center gap-2">
// // // // //           {/* Dark mode toggle */}
// // // // //           <button
// // // // //             onClick={toggleTheme}
// // // // //             className="px-2 py-1 border rounded dark:border-slate-600"
// // // // //           >
// // // // //             {dark ? "🌙" : "☀️"}
// // // // //           </button>

// // // // //           {/* Mobile menu */}
// // // // //           <button
// // // // //             onClick={() => setMenuOpen(!menuOpen)}
// // // // //             className="md:hidden px-2 py-1 border rounded dark:border-slate-600"
// // // // //           >
// // // // //             ☰
// // // // //           </button>
// // // // //         </div>
// // // // //       </div>

// // // // //       {/* Mobile Menu */}
// // // // //       {menuOpen && (
// // // // //         <div className="md:hidden bg-white dark:bg-slate-900 border-t dark:border-slate-700">
// // // // //           <Link href="/dashboard" className="block px-4 py-2">
// // // // //             Dashboard
// // // // //           </Link>
// // // // //           <Link href="/select-test" className="block px-4 py-2">
// // // // //             Exams
// // // // //           </Link>
// // // // //           <Link href="/profile" className="block px-4 py-2">
// // // // //             Profile
// // // // //           </Link>
// // // // //         </div>
// // // // //       )}
// // // // //     </nav>
// // // // //   );
// // // // // }
