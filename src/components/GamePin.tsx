"use client";

import { useState } from "react";

interface GamePinProps {
  code: string;
}

export default function GamePin({ code }: GamePinProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/game/${code}`
      : code;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
    }
  };

  return (
    <div className="text-center">
      <p className="text-sm text-white/60 font-medium mb-2" dir="rtl">{"\u200Fקוד המשחק"}</p>
      <button
        onClick={handleCopy}
        className="group relative inline-block"
      >
        <div className="text-6xl font-black tracking-[0.2em] text-white
                        bg-white/8 rounded-2xl px-8 py-4
                        border-2 border-white/15
                        group-hover:border-kahoot-gold group-hover:bg-white/15
                        group-hover:text-glow group-hover:shadow-[0_0_20px_rgba(255,215,0,0.2)]
                        group-focus-visible:ring-2 group-focus-visible:ring-kahoot-gold group-focus-visible:outline-none
                        transition-all duration-200"
             dir="ltr"
        >
          {code}
        </div>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2
                         text-xs text-white/50 whitespace-nowrap
                         group-hover:text-kahoot-gold transition-colors" dir="rtl">
          {copied ? <span>{"\u200Fהועתק\u200F!"} <span>{"\u2713"}</span></span> : "\u200Fלחצו להעתקה"}
        </span>
      </button>
    </div>
  );
}
