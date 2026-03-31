"use client";

interface HowToPlayProps {
  onClose: () => void;
}

export default function HowToPlay({ onClose }: HowToPlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center
                 bg-kahoot-purple-dark/95 backdrop-blur-md px-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm animate-bounce-in my-8" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-white">
            <span>{"\u200F\u05D0\u05D9\u05DA \u05DE\u05E9\u05D7\u05E7\u05D9\u05DD\u200F?"}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-2xl p-2 rounded-full hover:bg-white/15 transition-colors text-white/60 hover:text-white"
            aria-label="\u05E1\u05D2\u05D5\u05E8"
          >
            {"\u2715"}
          </button>
        </div>

        {/* Goal */}
        <div className="bg-kahoot-gold/15 border border-kahoot-gold/30 rounded-2xl px-4 py-3 mb-5">
          <p className="text-kahoot-gold font-bold text-sm mb-1 text-center">
            <span>{"\u{1F3AF}"}</span>{" "}
            <span>{"\u200F\u05DE\u05D8\u05E8\u05EA \u05D4\u05DE\u05E9\u05D7\u05E7"}</span>
          </p>
          <p className="text-white/70 text-sm leading-relaxed text-center">
            {"\u200F\u05D4\u05DE\u05D8\u05E8\u05D4 \u05D4\u05DE\u05E9\u05D5\u05EA\u05E4\u05EA \u05E9\u05DC \u05DB\u05DC \u05D4\u05DE\u05E9\u05EA\u05EA\u05E4\u05D9\u05DD \u05D4\u05D9\u05D0 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05D4\u05D0\u05DE\u05E6\u05E2 \u05D1\u05D9\u05DF \u05E9\u05EA\u05D9 \u05D4\u05DE\u05D9\u05DC\u05D9\u05DD. \u05DB\u05D5\u05DC\u05DD \u05DE\u05E0\u05E6\u05D7\u05D9\u05DD \u05DB\u05E9\u05E9\u05E0\u05D9\u05D9\u05DD \u05E9\u05D5\u05DC\u05D7\u05D9\u05DD \u05D0\u05EA \u05D0\u05D5\u05EA\u05D4 \u05DE\u05D9\u05DC\u05D4\u200F!"}
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          <StepCard
            number={1}
            color="bg-kahoot-green"
            text={"\u200F\u05DE\u05EA\u05D7\u05D9\u05DC\u05D9\u05DD \u05E2\u05DD \u05E9\u05EA\u05D9 \u05DE\u05D9\u05DC\u05D9\u05DD \u05D0\u05E7\u05E8\u05D0\u05D9\u05D5\u05EA \u05D0\u05D5 \u05E9\u05EA\u05D9 \u05DE\u05D9\u05DC\u05D9\u05DD \u05E9\u05D4\u05DE\u05E9\u05EA\u05EA\u05E4\u05D9\u05DD \u05E9\u05D5\u05DC\u05D7\u05D9\u05DD"}
          />
          <StepCard
            number={2}
            color="bg-kahoot-gold"
            text={"\u200F\u05D0\u05D7\u05E8\u05D9 \u05E9\u05E9\u05EA\u05D9 \u05D4\u05DE\u05D9\u05DC\u05D9\u05DD \u05E0\u05D7\u05E9\u05E4\u05D5\u05EA, \u05D6\u05D4 \u05D4\u05D6\u05DE\u05DF \u05DC\u05E0\u05E1\u05D5\u05EA \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05DE\u05D9\u05DC\u05EA \u05D4\u05D0\u05DE\u05E6\u05E2 \u05D1\u05D9\u05E0\u05D9\u05D4\u05DF"}
          />
          <StepCard
            number={3}
            color="bg-kahoot-pink"
            text={"\u200F\u05D1\u05E8\u05D2\u05E2 \u05E9\u05E9\u05E0\u05D9 \u05E9\u05D7\u05E7\u05E0\u05D9\u05DD \u05E9\u05D5\u05DC\u05D7\u05D9\u05DD \u05D0\u05EA \u05DE\u05D9\u05DC\u05EA \u05D4\u05D0\u05DE\u05E6\u05E2 \u05E9\u05DC\u05D4\u05DD, \u05D4\u05DF \u05E0\u05D7\u05E9\u05E4\u05D5\u05EA"}
          />
          <StepCard
            number={4}
            color="bg-kahoot-blue"
            text={"\u200F\u05E9\u05DC\u05D7\u05EA\u05DD \u05D0\u05D5\u05EA\u05D4 \u05DE\u05D9\u05DC\u05D4\u200F? \u05D4\u05E6\u05DC\u05D7\u05EA\u05DD\u200F! \u05DE\u05D9\u05DC\u05D9\u05DD \u05E9\u05D5\u05E0\u05D5\u05EA\u200F? \u05E0\u05E1\u05D5 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05D4\u05D0\u05DE\u05E6\u05E2 \u05E9\u05DC\u05D4\u05DF"}
          />
        </div>

        {/* Rule note */}
        <div className="mt-4 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
          <p className="text-white/50 text-xs font-bold text-center">
            {"\u200F\u05D0\u05E1\u05D5\u05E8 \u05DC\u05E9\u05DC\u05D5\u05D7 \u05DE\u05D9\u05DC\u05D4 \u05E9\u05DB\u05D1\u05E8 \u05D4\u05D5\u05E4\u05D9\u05E2\u05D4 \u05D1\u05D0\u05D5\u05EA\u05D5 \u05E1\u05D9\u05D1\u05D5\u05D1\u200F!"}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          dir="rtl"
          className="btn-3d w-full mt-5 rounded-2xl px-6 py-4 text-xl font-bold
                     bg-kahoot-green text-white
                     hover:brightness-110 active:scale-[0.97]
                     transition-all duration-150"
        >
          <span>{"\u200F\u05D9\u05D0\u05DC\u05DC\u05D4\u200F!"}</span>
        </button>
      </div>
    </div>
  );
}

function StepCard({
  number,
  color,
  text,
}: {
  number: number;
  color: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 items-start bg-white/8 rounded-2xl px-4 py-3 border border-white/10">
      <div
        className={`${color} w-7 h-7 rounded-full flex items-center justify-center
                    text-white font-black text-xs shrink-0 shadow-md mt-0.5`}
      >
        {number}
      </div>
      <p className="text-white/80 text-sm leading-relaxed">
        {text}
      </p>
    </div>
  );
}
