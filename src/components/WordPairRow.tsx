"use client";

import type { Round, Player, Submission } from "@/types/game";
import WordCard from "./WordCard";
import ElectricitySpark from "./ElectricitySpark";

/**
 * Maps similarity level (1-7) to a gap between cards.
 * Clamped with max-width on cards to prevent overflow.
 */
const LEVEL_GAP: Record<number, string> = {
  1: "2px",    // synonyms: כעוס/זועם — almost touching
  2: "8px",    // near-synonyms: שלג/חורף
  3: "20px",   // very related: פרח/עלה, בית/דירה
  4: "40px",   // related: עץ/גזע, סכין/מזלג
  5: "70px",   // somewhat related — BIG jump here
  6: "100px",  // weakly related
  7: "130px",  // unrelated: גרביים/צדק — edges of screen
};

const DEFAULT_GAP = "80px";

interface WordPairRowProps {
  round: Round;
  roundIndex: number;
  players: Player[];
  playerColorMap: Map<string, string>;
  submissions: Submission[];
  isLatest?: boolean;
  prevSimilarityLevel?: number | null;
}

export default function WordPairRow({
  round,
  roundIndex,
  players,
  playerColorMap,
  submissions,
  isLatest = false,
  prevSimilarityLevel = null,
}: WordPairRowProps) {
  const roundSubs = submissions
    .filter((s) => s.round_id === round.id)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const isComplete = round.is_complete;

  // Detect generated rounds: both submissions from the same player
  const isGenerated = roundSubs.length >= 2 && roundSubs[0].player_id === roundSubs[1].player_id;

  const matchPlayerIds = round.is_match
    ? new Set([round.player1_id, round.player2_id].filter(Boolean))
    : new Set<string>();

  // Starting gap = previous round's ending distance (or default for round 1).
  // Once this round is scored, animate to this round's semantic distance.
  const startGap = prevSimilarityLevel != null
    ? LEVEL_GAP[prevSimilarityLevel] ?? DEFAULT_GAP
    : DEFAULT_GAP;

  const currentGap = isComplete && round.similarity_level != null
    ? LEVEL_GAP[round.similarity_level]
    : startGap;

  return (
    <div className={`flex flex-col items-center gap-2
                     ${isLatest ? "opacity-100" : "opacity-70"}`}>
      {/* Round number badge */}
      <div className="flex items-center gap-2 mb-1">
        <div className="h-px w-8 bg-white/10" />
        <span className="text-xs font-bold text-white/30 bg-white/8 border border-white/8 rounded-full px-3 py-0.5">
          {`\u200F\u05EA\u05D5\u05E8 ${round.round_number}`}
        </span>
        <div className="h-px w-8 bg-white/10" />
      </div>

      {/* Word cards — gap animates when similarity_level arrives via Realtime */}
      <div
        className="flex items-start justify-center w-full px-2 relative"
        style={{
          gap: currentGap,
          transition: "gap 700ms cubic-bezier(.23, 1, .32, 1)",
        }}
      >
        {isComplete ? (
          <>
            {roundSubs.map((sub, i) => (
              <div key={sub.id} className="shrink-0">
                <WordCard
                  word={sub.word_raw || sub.word}
                  color={isGenerated ? "#9CA3AF" : (playerColorMap.get(sub.player_id) || "#666")}
                  revealed={true}
                  hasSubmission={true}
                  playerName={isGenerated ? "\u200F\u05DE\u05D9\u05DC\u05D4 \u05D0\u05E7\u05E8\u05D0\u05D9\u05EA" : players.find((p) => p.id === sub.player_id)?.nickname}
                  isMatch={round.is_match && matchPlayerIds.has(sub.player_id)}
                  animationDelay={i * 0.15}
                />
              </div>
            ))}
            {/* Electricity spark between very close words (level 1-2) */}
            {round.similarity_level != null && round.similarity_level <= 2 && roundSubs.length >= 2 && (
              <ElectricitySpark intensity={round.similarity_level === 1 ? "high" : "medium"} />
            )}
          </>
        ) : (
          <>
            {roundSubs.map((sub) => (
              <div key={sub.id} className="shrink-0">
                <WordCard
                  word={null}
                  color={playerColorMap.get(sub.player_id) || "#666"}
                  revealed={false}
                  hasSubmission={true}
                  playerName={players.find((p) => p.id === sub.player_id)?.nickname}
                />
              </div>
            ))}
            {roundSubs.length > 0 && (
              <div className="shrink-0">
                <WordCard
                  word={null}
                  color="#666"
                  revealed={false}
                  hasSubmission={false}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
