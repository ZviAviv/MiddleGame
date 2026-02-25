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
      <div className="flex-1 min-w-[120px] max-w-[160px] animate-pop-in">
        <div
          className="rounded-2xl px-4 py-6 text-center
                     shadow-[0_4px_0_rgba(0,0,0,0.25)]
                     min-h-[80px] flex items-center justify-center opacity-70"
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
      <div className="flex-1 min-w-[120px] max-w-[160px]">
        <div className="shimmer rounded-2xl px-4 py-6 text-center
                        border-2 border-dashed border-white/10 min-h-[80px]
                        flex items-center justify-center">
          <span className="text-2xl text-white/30 animate-pulse-slow">?</span>
        </div>
      </div>
    );
  }

  // State: word revealed
  return (
    <div
      className="flex-1 min-w-[120px] max-w-[160px] animate-bounce-in"
      style={{ animationDelay: `${animationDelay}s` }}
    >
      <div
        className={`rounded-2xl px-4 py-6 text-center
                    shadow-[0_4px_0_rgba(0,0,0,0.25)] shadow-lg
                    min-h-[80px] flex flex-col items-center justify-center
                    transition-all duration-300
                    hover:scale-[1.02]
                    ${isMatch ? "animate-glow-pulse ring-2 ring-kahoot-gold ring-offset-2 ring-offset-transparent" : ""}`}
        style={{ backgroundColor: color }}
      >
        <span className="text-xl font-bold text-white drop-shadow-sm break-words leading-tight">
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
