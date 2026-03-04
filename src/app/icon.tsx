import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 64,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #46178f 0%, #7b2ff7 100%)",
          borderRadius: 14,
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer ring */}
          <circle cx="24" cy="24" r="22" stroke="white" strokeWidth="3" fill="none" />
          {/* Middle ring */}
          <circle cx="24" cy="24" r="14" stroke="white" strokeWidth="2.5" fill="none" />
          {/* Inner ring */}
          <circle cx="24" cy="24" r="7" stroke="white" strokeWidth="2" fill="none" />
          {/* Bullseye dot */}
          <circle cx="24" cy="24" r="2.5" fill="#FFD700" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
