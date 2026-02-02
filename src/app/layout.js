import "./globals.css";

export const metadata = {
  title: "Smart Classroom",
  description: "QR Attendance System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
