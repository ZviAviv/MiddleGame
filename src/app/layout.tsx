import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: "משחק האמצע",
  description: "!מצאו את המילה באמצע",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${rubik.className} min-h-dvh text-white antialiased selection:bg-kahoot-gold/30 selection:text-white`}>
        <div className="mx-auto max-w-md min-h-dvh">
          {children}
        </div>
      </body>
    </html>
  );
}
