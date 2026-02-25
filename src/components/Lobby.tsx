"use client";

import type { Player } from "@/types/game";
import GamePin from "./GamePin";
import ShareButton from "./ShareButton";
import PlayerList from "./PlayerList";

interface LobbyProps {
  code: string;
  players: Player[];
  currentPlayerId: string | null;
  playerColorMap: Map<string, string>;
}

export default function Lobby({ code, players, currentPlayerId, playerColorMap }: LobbyProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-10 gap-8">
      {/* Title */}
      <div className="text-center animate-bounce-in" dir="rtl">
        <h1 className="text-4xl font-black mb-1">
          <span>{"\u200Fמשחק האמצע"}</span>{" "}
          <span>{"\u{1F3AF}"}</span>
        </h1>
      </div>

      {/* Big Game PIN */}
      <div className="animate-slide-up">
        <GamePin code={code} />
      </div>

      {/* Share Button */}
      <div className="w-full max-w-xs animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <ShareButton code={code} />
      </div>

      {/* Player Count & List */}
      <div className="w-full max-w-sm text-center animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <p className="text-lg font-bold text-white/80 mb-3" dir="rtl">
          <span>{players.length} שחקנים במשחק</span>{" "}
          <span>{"\u{1F3AE}"}</span>
        </p>
        <PlayerList
          players={players}
          currentPlayerId={currentPlayerId}
          playerColorMap={playerColorMap}
        />
      </div>

      {/* Instructions */}
      <div className="text-center animate-slide-up" style={{ animationDelay: "0.3s" }}>
        <div className="bg-white/8 rounded-2xl px-6 py-4 border border-white/12 shadow-lg" dir="rtl">
          <p className="text-white/60 text-sm font-medium">
            <span>{"\u200Fשלחו מילה כדי להתחיל את המשחק"}</span>{" "}
            <span>{"\u270F\uFE0F"}</span>
          </p>
          <p className="text-white/40 text-xs mt-1">
            {"\u200Fכל שחקן יכול להתחיל..."}
          </p>
        </div>
      </div>

      {/* Waiting animation */}
      <div className="flex gap-1.5 items-center text-white/40" dir="rtl">
        <span className="text-sm">ממתינים</span>
        <span className="animate-bounce text-kahoot-pink" style={{ animationDelay: "0s" }}>.</span>
        <span className="animate-bounce text-kahoot-gold" style={{ animationDelay: "0.15s" }}>.</span>
        <span className="animate-bounce text-kahoot-blue" style={{ animationDelay: "0.3s" }}>.</span>
      </div>
    </div>
  );
}
