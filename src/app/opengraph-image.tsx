import { ImageResponse } from "next/og";

export const alt = "משחק האמצע";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #46178f 0%, #7b2ff7 50%, #46178f 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Target icon */}
        <svg
          width="180"
          height="180"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="24" cy="24" r="22" stroke="white" strokeWidth="2" fill="none" />
          <circle cx="24" cy="24" r="14" stroke="white" strokeWidth="1.5" fill="none" />
          <circle cx="24" cy="24" r="7" stroke="white" strokeWidth="1.2" fill="none" />
          <circle cx="24" cy="24" r="2.5" fill="#FFD700" />
        </svg>

        {/* Title */}
        <div
          style={{
            marginTop: 40,
            fontSize: 72,
            fontWeight: 900,
            color: "white",
            textAlign: "center",
            direction: "rtl",
          }}
        >
          !משחק האמצע
        </div>

        {/* Subtitle */}
        <div
          style={{
            marginTop: 16,
            fontSize: 32,
            color: "rgba(255, 255, 255, 0.7)",
            textAlign: "center",
            direction: "rtl",
          }}
        >
          המשחק שבו כולם חושבים באמצע
        </div>
      </div>
    ),
    { ...size }
  );
}
