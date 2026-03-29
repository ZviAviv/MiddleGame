"use client";

interface HowToPlayProps {
  onClose: () => void;
}

export default function HowToPlay({ onClose }: HowToPlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center
                 bg-kahoot-purple-dark/95 backdrop-blur-md px-5"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm animate-bounce-in" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-black text-white">
            <span>{"\u200F\u05D0\u05D9\u05DA \u05DE\u05E9\u05D7\u05E7\u05D9\u05DD\u200F?"}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-2xl p-2 rounded-full hover:bg-white/15 transition-colors text-white/60 hover:text-white"
            aria-label="סגור"
          >
            {"\u2715"}
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          <StepCard
            number={1}
            color="bg-kahoot-blue"
            title={"\u200F\u05E6\u05E8\u05D5 \u05D0\u05D5 \u05D4\u05E6\u05D8\u05E8\u05E4\u05D5 \u05DC\u05DE\u05E9\u05D7\u05E7"}
            description={"\u200F\u05E9\u05EA\u05E4\u05D5 \u05D0\u05EA \u05D4\u05E7\u05D5\u05D3 \u05E2\u05DD \u05D7\u05D1\u05E8\u05D9\u05DD"}
          />
          <StepCard
            number={2}
            color="bg-kahoot-green"
            title={"\u200F\u05E9\u05D5\u05DC\u05D7\u05D9\u05DD \u05DE\u05D9\u05DC\u05D9\u05DD"}
            description={"\u200F\u05D4\u05DE\u05D9\u05DC\u05D9\u05DD \u05DC\u05D0 \u05E0\u05D7\u05E9\u05E4\u05D5\u05EA \u05E2\u05D3 \u05E9\u05E9\u05E0\u05D9 \u05E9\u05D7\u05E7\u05E0\u05D9\u05DD \u05E9\u05D5\u05DC\u05D7\u05D9\u05DD \u05DE\u05D9\u05DC\u05D9\u05DD"}
          />
          <StepCard
            number={3}
            color="bg-kahoot-gold"
            title={"\u200F\u05D4\u05DE\u05D9\u05DC\u05D9\u05DD \u05E0\u05D7\u05E9\u05E4\u05D5\u05EA"}
            description={"\u200F\u05D1\u05DB\u05DC \u05EA\u05D5\u05E8 \u05EA\u05E8\u05D0\u05D5 \u05D0\u05EA \u05E9\u05EA\u05D9 \u05D4\u05DE\u05D9\u05DC\u05D9\u05DD \u05E9\u05E0\u05E9\u05DC\u05D7\u05D5. \u05E0\u05E1\u05D5 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05D4\u05DE\u05D9\u05DC\u05D4 \u05E9\u05D1\u05D0\u05DE\u05E6\u05E2\u200F!"}
          />
          <StepCard
            number={4}
            color="bg-kahoot-pink"
            title={"\u200F\u05DE\u05E9\u05D7\u05E7 \u05D4\u05D0\u05DE\u05E6\u05E2\u200F!"}
            description={"\u200F\u05DB\u05E9\u05E9\u05E0\u05D9 \u05E9\u05D7\u05E7\u05E0\u05D9\u05DD \u05E9\u05D5\u05DC\u05D7\u05D9\u05DD \u05D0\u05EA \u05D0\u05D5\u05EA\u05D4 \u05DE\u05D9\u05DC\u05D4 \u2014 \u05E0\u05D9\u05E6\u05D7\u05EA\u05DD\u200F!"}
          />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          dir="rtl"
          className="btn-3d w-full mt-6 rounded-2xl px-6 py-4 text-xl font-bold
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
  title,
  description,
}: {
  number: number;
  color: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 items-start bg-white/8 rounded-2xl p-4 border border-white/10">
      <div
        className={`${color} w-8 h-8 rounded-full flex items-center justify-center
                    text-white font-black text-sm shrink-0 shadow-md`}
      >
        {number}
      </div>
      <div>
        <p className="text-white font-bold text-base">{title}</p>
        <p className="text-white/60 text-sm mt-0.5">{description}</p>
      </div>
    </div>
  );
}
