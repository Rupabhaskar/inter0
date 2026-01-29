// "use client";

// import { useState } from "react";
// import {
//   signInWithEmailAndPassword,
//   GoogleAuthProvider,
//   signInWithPopup,
// } from "firebase/auth";
// import { Eye, EyeOff } from "lucide-react";
// import { auth } from "@/lib/firebase";
// import { useRouter } from "next/navigation";

// export default function LoginPage() {
//   const router = useRouter();
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [loading, setLoading] = useState(false);

//   const loginEmail = async () => {
//     setLoading(true);
//     try {
//       await signInWithEmailAndPassword(auth, email, password);
//       router.push("/dashboard");
//     } catch (error) {
//       alert("❌ Invalid email or password");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loginGoogle = async () => {
//     try {
//       const provider = new GoogleAuthProvider();
//       await signInWithPopup(auth, provider);
//       router.push("/dashboard");
//     } catch {
//       alert("❌ Google login failed");
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
//       <div className="bg-gray-900 p-8 rounded-xl w-full max-w-sm space-y-4">
//         <h2 className="text-2xl font-bold text-center">Login</h2>

//         <input
//           placeholder="Email"
//           className="w-full p-2 rounded bg-gray-800"
//           onChange={(e) => setEmail(e.target.value)}
//         />

//         {/* Password Field with Lucide Eye Icon */}
//         <div className="relative">
//           <input
//             type={showPassword ? "text" : "password"}
//             placeholder="Password"
//             className="w-full p-2 rounded bg-gray-800 pr-10"
//             onChange={(e) => setPassword(e.target.value)}
//           />

//           <button
//             type="button"
//             onClick={() => setShowPassword(!showPassword)}
//             className="absolute right-2 top-2.5 text-gray-400 hover:text-white"
//           >
//             {showPassword ? (
//               <EyeOff size={18} />
//             ) : (
//               <Eye size={18} />
//             )}
//           </button>
//         </div>

//         <button
//           onClick={loginEmail}
//           disabled={loading}
//           className="w-full bg-cyan-500 p-2 rounded disabled:opacity-50"
//         >
//           {loading ? "Logging in..." : "Login"}
//         </button>

//         <button
//           onClick={loginGoogle}
//           className="w-full bg-white text-black p-2 rounded"
//         >
//           Login with Google
//         </button>
//       </div>
//     </div>
//   );
// }


"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const loginEmail = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (error) {
      alert("❌ Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="bg-gray-900 p-8 rounded-xl w-full max-w-sm space-y-4">
        <h2 className="text-2xl font-bold text-center">Student Login</h2>

        <input
          placeholder="Email"
          className="w-full p-2 rounded bg-gray-800"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password Field with Eye Toggle */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full p-2 rounded bg-gray-800 pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-2.5 text-gray-400 hover:text-white"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button
          onClick={loginEmail}
          disabled={loading}
          className="w-full bg-cyan-500 p-2 rounded disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
    </div>
  );
}
