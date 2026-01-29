import "./globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/components/AuthProvider";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900">
        <AuthProvider>
          <Navbar />
          <main className="pt-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
