"use client";

import type { Round, Player, Submission } from "@/types/game";
import WordCard from "./WordCard";

interface WordPairRowProps {
  round: Round;
  roundIndex: number;
  players: Player[];
  playerColorMap: Map<string, string>;
  submissions: Submission[];
  isLatest?: boolean;
}

export default function WordPairRow({
  round,
  roundIndex,
  players,
  playerColorMap,
  submissions,
  isLatest = false,
}: WordPairRowProps) {
  const roundSubs = submissions
    .filter((s) => s.round_id === round.id)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const isComplete = round.is_complete;

  // The matching pair player IDs (only set when is_match is true)
  const matchPlayerIds = round.is_match
    ? new Set([round.player1_id, round.player2_id].filter(Boolean))
    : new Set<string>();

  return (
    <div className={`flex flex-col items-center gap-2
                     ${isLatest ? "opacity-100" : "opacity-70"}`}>
      {/* Round number badge */}
      <div className="flex items-center gap-2 mb-1">
        <div className="h-px w-8 bg-white/10" />
        <span className="text-xs font-bold text-white/30 bg-white/8 border border-white/8 rounded-full px-3 py-0.5">
          {`\u200Fסיבוב ${round.round_number}`}
        </span>
        <div className="h-px w-8 bg-white/10" />
      </div>

      {/* Word cards */}
      <div className="flex gap-3 items-start justify-center w-full px-4 flex-wrap">
        {isComplete ? (
          // Revealed: show all submissions
          roundSubs.map((sub, i) => (
            <WordCard
              key={sub.id}
              word={sub.word_raw || sub.word}
              color={playerColorMap.get(sub.player_id) || "#666"}
              revealed={true}
              hasSubmission={true}
              playerName={players.find((p) => p.id === sub.player_id)?.nickname}
              isMatch={round.is_match && matchPlayerIds.has(sub.player_id)}
              animationDelay={i * 0.15}
            />
          ))
        ) : (
          // Not complete: show hidden cards for submitted + shimmer placeholder
          <>
            {roundSubs.map((sub) => (
              <WordCard
                key={sub.id}
                word={null}
                color={playerColorMap.get(sub.player_id) || "#666"}
                revealed={false}
                hasSubmission={true}
                playerName={players.find((p) => p.id === sub.player_id)?.nickname}
              />
            ))}
            {/* Show one shimmer placeholder if there are submissions but round isn't complete */}
            {roundSubs.length > 0 && (
              <WordCard
                word={null}
                color="#666"
                revealed={false}
                hasSubmission={false}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
