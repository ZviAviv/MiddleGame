"use client";

import { useState } from "react";

interface ShareButtonProps {
  code: string;
}

export default function ShareButton({ code }: ShareButtonProps) {
  const [shared, setShared] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/game/${code}`
    : "";

  const handleShare = async () => {
    const shareData = {
      title: "\u200Fמשחק האמצע \u{1F3AF}",
      text: `\u200Fבואו לשחק איתנו משחק האמצע!\n\u200Fקוד: ${code}`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareUrl}`);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      // User cancelled share dialog
    }
  };

  return (
    <button
      onClick={handleShare}
      dir="rtl"
      className="btn-3d w-full rounded-2xl px-6 py-3 text-lg font-bold
                 bg-kahoot-pink text-white
                 hover:brightness-110 hover:shadow-[0_0_20px_rgba(255,45,120,0.3)]
                 active:scale-[0.97]
                 transition-all duration-150"
    >
      {shared
        ? <span><span>{"\u200Fהקישור הועתק\u200F!"}</span> <span>{"\u2713"}</span></span>
        : <span><span>{"\u200Fשתפו חברים וחברות\u200F!"}</span> <span>{"\u{1F4E4}"}</span></span>
      }
    </button>
  );
}
