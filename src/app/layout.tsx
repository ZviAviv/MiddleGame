import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-rubik",
});

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "\u05DE\u05E9\u05D7\u05E7 \u05D4\u05D0\u05DE\u05E6\u05E2",
  description: "\u200F\u05D4\u05DE\u05E9\u05D7\u05E7 \u05E9\u05D1\u05D5 \u05DB\u05D5\u05DC\u05DD \u05D7\u05D5\u05E9\u05D1\u05D9\u05DD \u05D1\u05D0\u05DE\u05E6\u05E2\u200F!",
  openGraph: {
    title: "\u05DE\u05E9\u05D7\u05E7 \u05D4\u05D0\u05DE\u05E6\u05E2 \u{1F3AF}",
    description: "\u200F\u05D4\u05DE\u05E9\u05D7\u05E7 \u05E9\u05D1\u05D5 \u05DB\u05D5\u05DC\u05DD \u05D7\u05D5\u05E9\u05D1\u05D9\u05DD \u05D1\u05D0\u05DE\u05E6\u05E2\u200F!",
    type: "website",
    locale: "he_IL",
  },
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
