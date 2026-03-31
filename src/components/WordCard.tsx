"use client";

interface WordCardProps {
  word: string | null;
  color: string;
  revealed: boolean;
  hasSubmission: boolean;
  playerName?: string;
  isMatch?: boolean;
  animationDelay?: number;
}

const CARD_CLASS = "w-[130px] shrink-0";

export default function WordCard({
  word,
  color,
  revealed,
  hasSubmission,
  playerName,
  isMatch = false,
  animationDelay = 0,
}: WordCardProps) {
  // State: someone submitted but word not yet revealed (other player hasn't submitted)
  if (hasSubmission && !revealed) {
    return (
      <div className={`${CARD_CLASS} animate-card-reveal`} style={{ opacity: 0 }}>
        <div
          className="rounded-2xl px-3 py-5 text-center
                     shadow-[0_4px_0_rgba(0,0,0,0.25)]
                     min-h-[72px] flex items-center justify-center opacity-70"
          style={{ backgroundColor: color }}
        >
          <span className="text-2xl text-white/80">{"\u{1F92B}"}</span>
        </div>
        {playerName && (
          <p className="text-center text-xs text-white/50 mt-1.5 font-medium truncate">
            {playerName}
          </p>
        )}
      </div>
    );
  }

  // State: no submission yet — empty placeholder
  if (!revealed || !word) {
    return (
      <div className={CARD_CLASS}>
        <div className="shimmer rounded-2xl px-3 py-5 text-center
                        border-2 border-dashed border-white/10 min-h-[72px]
                        flex items-center justify-center">
          <span className="text-2xl text-white/30 animate-pulse-slow">?</span>
        </div>
      </div>
    );
  }

  // State: word revealed
  return (
    <div
      className={`${CARD_CLASS} animate-card-reveal`}
      style={{ opacity: 0, animationDelay: `${animationDelay}s` }}
    >
      <div
        className={`rounded-2xl px-3 py-5 text-center
                    shadow-[0_4px_0_rgba(0,0,0,0.25)] shadow-lg
                    min-h-[72px] flex flex-col items-center justify-center
                    transition-all duration-300
                    hover:scale-[1.02]
                    ${isMatch ? "animate-glow-pulse-subtle ring-1 ring-kahoot-gold/40" : ""}`}
        style={{ backgroundColor: color }}
      >
        <span className="text-lg font-bold text-white drop-shadow-sm break-words leading-tight">
          {word}
        </span>
      </div>
      {playerName && (
        <p className="text-center text-xs text-white/50 mt-1.5 font-medium truncate">
          {playerName}
        </p>
      )}
    </div>
  );
}
