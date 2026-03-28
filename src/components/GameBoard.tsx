"use client";

import { useEffect, useRef } from "react";
import type { Round, Player, Submission } from "@/types/game";
import WordPairRow from "./WordPairRow";

interface GameBoardProps {
  rounds: Round[];
  players: Player[];
  playerColorMap: Map<string, string>;
  submissions: Submission[];
}

export default function GameBoard({ rounds, players, playerColorMap, submissions }: GameBoardProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when rounds or submissions change
  useEffect(() => {
    if (rounds.length > 0 || submissions.length > 0) {
      const timer = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [rounds.length, submissions.length, rounds[rounds.length - 1]?.is_complete]);

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
    <div className="flex-1 overflow-y-auto scroll-smooth px-2 pt-4 pb-32 space-y-6">
      <div className="relative">
        {visibleRounds.map((round, i) => (
          <div key={round.id} className="mb-6 last:mb-0">
            <WordPairRow
              round={round}
              roundIndex={i}
              players={players}
              playerColorMap={playerColorMap}
              submissions={submissions}
              isLatest={i === visibleRounds.length - 1}
            />
          </div>
        ))}
      </div>

      {/* Scroll anchor */}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
