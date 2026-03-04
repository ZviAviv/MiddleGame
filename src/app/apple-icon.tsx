import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #46178f 0%, #7b2ff7 100%)",
          borderRadius: 40,
        }}
      >
        <svg
          width="130"
          height="130"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="24" cy="24" r="22" stroke="white" strokeWidth="2.5" fill="none" />
          <circle cx="24" cy="24" r="14" stroke="white" strokeWidth="2" fill="none" />
          <circle cx="24" cy="24" r="7" stroke="white" strokeWidth="1.5" fill="none" />
          <circle cx="24" cy="24" r="2.5" fill="#FFD700" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
