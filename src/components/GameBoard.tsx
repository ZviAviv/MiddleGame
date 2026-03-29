"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Round, Player, Submission } from "@/types/game";
import WordPairRow from "./WordPairRow";

interface GameBoardProps {
  rounds: Round[];
  players: Player[];
  playerColorMap: Map<string, string>;
  submissions: Submission[];
}

export default function GameBoard({ rounds, players, playerColorMap, submissions }: GameBoardProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevSubCountRef = useRef(0);
  const prevRoundCountRef = useRef(0);

  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      });
    }
  }, []);

  // Scroll when submission count or round count actually increases
  useEffect(() => {
    const subCount = submissions.length;
    const roundCount = rounds.length;
    const subChanged = subCount > prevSubCountRef.current;
    const roundChanged = roundCount > prevRoundCountRef.current;

    prevSubCountRef.current = subCount;
    prevRoundCountRef.current = roundCount;

    if (subChanged || roundChanged) {
      // Multiple delays to catch layout shifts from card gap animations
      const timers = [50, 300, 700].map((ms) => setTimeout(scrollToBottom, ms));
      return () => timers.forEach(clearTimeout);
    }
  }, [submissions.length, rounds.length, scrollToBottom]);

  // Also scroll when the latest round gets its similarity level (cards move)
  const latestSimilarity = rounds[rounds.length - 1]?.similarity_level;
  useEffect(() => {
    if (latestSimilarity != null) {
      const timer = setTimeout(scrollToBottom, 400);
      return () => clearTimeout(timer);
    }
  }, [latestSimilarity, scrollToBottom]);

  // Only show rounds that have at least one submission
  const visibleRounds = rounds.filter((r) => r.is_complete || submissions.some((s) => s.round_id === r.id));

  if (visibleRounds.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center text-white/50 animate-fade-scale-in" dir="rtl">
          <p className="text-4xl mb-3"><span>{"\u{1F914}"}</span></p>
          <p className="text-lg font-medium">{"\u200Fמחכים למילה הראשונה..."}</p>
          <p className="text-sm mt-1"><span>{"\u200Fשלחו מילה כדי להתחיל\u200F!"}</span></p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth px-2 pt-4 pb-32 space-y-6 scrollbar-hide">
      <div className="relative">
        {visibleRounds.map((round, i) => {
          const prevRound = i > 0 ? visibleRounds[i - 1] : null;
          return (
            <div key={round.id} className="mb-6 last:mb-0">
              <WordPairRow
                round={round}
                roundIndex={i}
                players={players}
                playerColorMap={playerColorMap}
                submissions={submissions}
                isLatest={i === visibleRounds.length - 1}
                prevSimilarityLevel={prevRound?.similarity_level ?? null}
              />
            </div>
          );
        })}
      </div>

      {/* Scroll anchor */}
      <div className="h-1" />
    </div>
  );
}
