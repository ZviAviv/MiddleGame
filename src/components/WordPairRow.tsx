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
  const player1 = players.find((p) => p.id === round.player1_id);
  const player2 = players.find((p) => p.id === round.player2_id);

  const isComplete = round.word1 !== null && round.word2 !== null;

  // Check if there are submissions for this round (for hidden card display)
  const roundSubs = submissions.filter((s) => s.round_id === round.id);
  const hasSub1 = roundSubs.some((s) => s.position === 1);
  const hasSub2 = roundSubs.some((s) => s.position === 2);

  // Player colors — use the submitting player's color, or fallback
  const color1 = (round.player1_id && playerColorMap.get(round.player1_id)) || "#666";
  const color2 = (round.player2_id && playerColorMap.get(round.player2_id)) || "#666";

  // For unrevealed cards with a submission, try to get color from the submission's player
  const sub1Color = hasSub1
    ? (playerColorMap.get(roundSubs.find((s) => s.position === 1)?.player_id || "") || "#666")
    : "#666";
  const sub2Color = hasSub2
    ? (playerColorMap.get(roundSubs.find((s) => s.position === 2)?.player_id || "") || "#666")
    : "#666";

  const sub1Player = hasSub1
    ? players.find((p) => p.id === roundSubs.find((s) => s.position === 1)?.player_id)
    : undefined;
  const sub2Player = hasSub2
    ? players.find((p) => p.id === roundSubs.find((s) => s.position === 2)?.player_id)
    : undefined;

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
      <div className="flex gap-3 items-start justify-center w-full px-4">
        <WordCard
          word={isComplete ? (round.word1_raw || round.word1) : null}
          color={isComplete ? color1 : sub1Color}
          revealed={isComplete && round.word1 !== null}
          hasSubmission={hasSub1}
          playerName={isComplete ? player1?.nickname : sub1Player?.nickname}
          isMatch={round.is_match}
          animationDelay={0}
        />

        {/* Connector dots */}
        <div className="flex flex-col items-center self-center pt-2 gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${isComplete ? "bg-white/30" : "bg-white/10 animate-pulse"}`} />
          <div className={`w-1.5 h-1.5 rounded-full ${isComplete ? "bg-white/25" : "bg-white/10 animate-pulse"}`} style={{ animationDelay: "0.15s" }} />
          <div className={`w-1.5 h-1.5 rounded-full ${isComplete ? "bg-white/20" : "bg-white/10 animate-pulse"}`} style={{ animationDelay: "0.3s" }} />
        </div>

        <WordCard
          word={isComplete ? (round.word2_raw || round.word2) : null}
          color={isComplete ? color2 : sub2Color}
          revealed={isComplete && round.word2 !== null}
          hasSubmission={hasSub2}
          playerName={isComplete ? player2?.nickname : sub2Player?.nickname}
          isMatch={round.is_match}
          animationDelay={0.2}
        />
      </div>
    </div>
  );
}
