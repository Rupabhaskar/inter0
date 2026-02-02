"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

// 🔥 ICONS
import {
  LayoutDashboard,
  BookOpen,
  User,
  LogOut,
  Menu,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // defer mounted flag to avoid synchronous setState inside effect
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const hideNavbar =
    pathname === "/" || pathname.startsWith("/test");

  if (!mounted || hideNavbar) return null;

  async function handleLogout() {
    await signOut(auth);
    router.push("/");
  }

  const linkClass = (href) =>
    `flex items-center gap-2.5 px-4 py-2.5 rounded-md text-base font-medium transition ${
      pathname === href
        ? "bg-blue-600 text-white"
        : "text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <nav className="bg-white border-b border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between gap-4 min-h-0">
        {/* LOGO - contained inside navbar, no overflow */}
        <Link href="/" className="flex items-center shrink-0 max-h-full py-1">
          <Image
            src="/Ranksprint.png"
            alt="RankSprint - Practice. Perform. Achieve."
            width={320}
            height={96}
            className="h-14 md:h-[10rem] w-auto max-h-full object-contain object-left"
            priority
          />
        </Link>

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
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200">
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
