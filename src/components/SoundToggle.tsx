"use client";

import { useState } from "react";
import { soundManager } from "@/lib/sounds";

export default function SoundToggle() {
  const [muted, setMuted] = useState(soundManager?.isMuted ?? false);

  const toggle = () => {
    const newMuted = soundManager?.toggleMute() ?? false;
    setMuted(newMuted);
  };

  return (
    <button
      onClick={toggle}
      className="text-xl p-2 rounded-full hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-kahoot-gold focus-visible:outline-none transition-colors"
      title={muted ? "הפעילו צלילים" : "השתיקו צלילים"}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
