"use client";

import { useEffect, useRef } from "react";
import type { Player, Submission } from "@/types/game";

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string | null;
  playerColorMap: Map<string, string>;
  currentRoundSubmissions?: Submission[];
  onlinePlayerIds?: Set<string> | null;
}

export default function PlayerList({
  players,
  currentPlayerId,
  playerColorMap,
  currentRoundSubmissions = [],
  onlinePlayerIds,
}: PlayerListProps) {
  const prevCountRef = useRef(players.length);

  useEffect(() => {
    prevCountRef.current = players.length;
  }, [players.length]);

  const submittedPlayerIds = new Set(currentRoundSubmissions.map((s) => s.player_id));

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {players.map((player, i) => {
        const isNew = i >= prevCountRef.current;
        const isMe = player.id === currentPlayerId;
        const hasSubmitted = submittedPlayerIds.has(player.id);
        const playerColor = playerColorMap.get(player.id) || "#666";
        // If presence tracking is active, check online status; otherwise assume online
        const isOnline = !onlinePlayerIds || onlinePlayerIds.has(player.id);

        return (
          <div
            key={player.id}
            className={`flex items-center gap-2 rounded-full px-4 py-2
                        bg-white/8 border border-white/12
                        ${isMe ? "border-kahoot-gold/50 bg-kahoot-gold/10 shadow-[0_0_12px_rgba(255,215,0,0.15)]" : ""}
                        ${!isOnline ? "opacity-40" : ""}
                        ${isNew ? "animate-pop-in" : ""}
                        focus-visible:ring-2 focus-visible:ring-kahoot-gold focus-visible:outline-none
                        transition-all duration-200`}
          >
            {/* Player color dot with online indicator */}
            <div className="relative">
              <div
                className={`w-3 h-3 rounded-full transition-all duration-300 ${hasSubmitted ? "animate-pulse ring-2 ring-kahoot-green/60" : ""}`}
                style={{ backgroundColor: isOnline ? playerColor : "#666" }}
              />
            </div>
            <span className="text-sm font-medium text-white/90">
              {player.nickname}
              {isMe && " (\u05D0\u05E0\u05D9)"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
