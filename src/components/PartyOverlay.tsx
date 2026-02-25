"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { soundManager } from "@/lib/sounds";
import type { Player, Round } from "@/types/game";
import { PLAYER_COLORS } from "@/lib/utils";

interface PartyOverlayProps {
  matchWord: string;
  players: Player[];
  player1Id: string | null;
  player2Id: string | null;
  rounds: Round[];
  playerColorMap: Map<string, string>;
}

function getRoundMessage(count: number): string {
  if (count <= 3) return "\u200Fוואו, מהר\u200F!";
  if (count <= 8) return "\u200Fעבודת צוות מעולה\u200F!";
  return "\u200Fהדרך הייתה שווה את זה\u200F!";
}

interface ScatteredCard {
  text: string;
  color: string;
  x: number;
  y: number;
  rotation: number;
  size: number;
  delay: number;
}

export default function PartyOverlay({
  matchWord,
  players,
  player1Id,
  player2Id,
  rounds,
  playerColorMap,
}: PartyOverlayProps) {
  const router = useRouter();
  const [showNewGame, setShowNewGame] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [partyStarted, setPartyStarted] = useState(false);
  const confettiFired = useRef(false);

  const player1 = players.find((p) => p.id === player1Id);
  const player2 = players.find((p) => p.id === player2Id);
  const roundCount = rounds.length;

  // Gather all words from all rounds for the scattered background cards
  const scatteredCards = useMemo<ScatteredCard[]>(() => {
    const cards: ScatteredCard[] = [];
    rounds.forEach((r) => {
      if (r.word1_raw || r.word1) {
        cards.push({
          text: r.word1_raw || r.word1 || "",
          color: (r.player1_id && playerColorMap.get(r.player1_id)) || PLAYER_COLORS[0],
          x: Math.random() * 80 + 10,
          y: Math.random() * 70 + 10,
          rotation: (Math.random() - 0.5) * 30,
          size: 0.6 + Math.random() * 0.2,
          delay: Math.random() * 1.5,
        });
      }
      if (r.word2_raw || r.word2) {
        cards.push({
          text: r.word2_raw || r.word2 || "",
          color: (r.player2_id && playerColorMap.get(r.player2_id)) || PLAYER_COLORS[1],
          x: Math.random() * 80 + 10,
          y: Math.random() * 70 + 10,
          rotation: (Math.random() - 0.5) * 30,
          size: 0.6 + Math.random() * 0.2,
          delay: Math.random() * 1.5,
        });
      }
    });
    return cards;
  }, [rounds, playerColorMap]);

  // Step 1: Show the match, Step 2: Party after 1.5s
  useEffect(() => {
    const partyTimer = setTimeout(() => {
      setPartyStarted(true);
      setShaking(true);
      soundManager?.play("party");
      navigator.vibrate?.([200, 100, 200, 100, 400]);

      if (!confettiFired.current) {
        confettiFired.current = true;
        fireConfetti();
      }
    }, 1500);

    return () => {
      clearTimeout(partyTimer);
    };
  }, []);

  useEffect(() => {
    if (!partyStarted) return;

    const shakeTimer = setTimeout(() => setShaking(false), 2000);
    const newGameTimer = setTimeout(() => setShowNewGame(true), 3500);

    return () => {
      clearTimeout(shakeTimer);
      clearTimeout(newGameTimer);
    };
  }, [partyStarted]);

  async function fireConfetti() {
    try {
      const confetti = (await import("canvas-confetti")).default;
      const colors = ["#FF3D5A", "#00B4FF", "#FFE02E", "#00C853", "#FF2D78", "#FFD700"];

      confetti({ particleCount: 100, spread: 80, origin: { x: 0.5, y: 0.5 }, colors, startVelocity: 30 });
      setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors }), 300);
      setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors }), 500);
      setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { x: 0.5, y: 0 }, colors, gravity: 0.8, startVelocity: 25 }), 800);
      setTimeout(() => confetti({ particleCount: 120, spread: 100, origin: { x: 0.5, y: 0.4 }, colors, startVelocity: 40 }), 1500);
    } catch {
      // canvas-confetti not available
    }
  }

  // Pre-party: just show the overlay with the match (words revealed on the board)
  if (!partyStarted) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center
                       bg-kahoot-purple-dark/92 backdrop-blur-md"
           role="dialog" aria-modal="true">
        <div className="relative text-center animate-bounce-in z-10" dir="rtl">
          <div className="bg-kahoot-gold rounded-3xl px-10 py-6
                          shadow-[0_6px_0_rgba(0,0,0,0.3)]
                          border-2 border-white/20
                          animate-glow-pulse">
            <span className="text-3xl font-black text-kahoot-purple-dark">
              {matchWord}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center
                     bg-kahoot-purple-dark/92 backdrop-blur-md
                     ${shaking ? "animate-shake" : ""}`}
         role="dialog" aria-modal="true">

      {/* Scattered card shapes background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {scatteredCards.map((card, i) => (
          <div
            key={i}
            className="absolute animate-slide-up"
            style={{
              left: `${card.x}%`,
              top: `${card.y}%`,
              transform: `rotate(${card.rotation}deg) scale(${card.size})`,
              opacity: 0.5,
              animationDelay: `${card.delay}s`,
            }}
          >
            <div
              className="rounded-xl px-3 py-2 text-center shadow-md min-w-[60px]"
              style={{ backgroundColor: card.color }}
            >
              <span className="text-sm font-bold text-white whitespace-nowrap">
                {card.text}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Glow circle behind text */}
      <div className="absolute w-80 h-80 rounded-full bg-kahoot-gold/15 blur-3xl" />

      {/* Win text */}
      <div className="relative text-center animate-bounce-in z-10" dir="rtl">
        <p className="text-5xl mb-4"><span>{"\u{1F389}"}</span><span>{"\u{1F38A}"}</span></p>
        <h2 className="text-3xl font-black text-kahoot-gold drop-shadow-lg mb-2
                       animate-glow-pulse inline-block px-4 leading-relaxed">
          {"\u200Fמשחק האמצע\u200F! משחק האמצע\u200F!"}
        </h2>
      </div>

      {/* The matching word */}
      <div className="relative animate-bounce-in mt-4 z-10" style={{ animationDelay: "0.3s" }}>
        <div className="bg-kahoot-gold rounded-3xl px-10 py-6
                        shadow-[0_6px_0_rgba(0,0,0,0.3)]
                        border-2 border-white/20
                        animate-glow-pulse">
          <span className="text-3xl font-black text-kahoot-purple-dark">
            {matchWord}
          </span>
        </div>
      </div>

      {/* Round counter */}
      <div className="animate-slide-up mt-5 z-10" style={{ animationDelay: "0.5s" }} dir="rtl">
        <p className="text-white/80 text-lg font-bold text-center">
          {"\u200Fהגעתם לאמצע ב-"}
          <span className="text-3xl font-black text-kahoot-gold mx-1">{roundCount}</span>
          {"\u200Fסיבובים\u200F!"}
        </p>
        <p className="text-kahoot-gold/80 text-base font-bold text-center mt-1">
          {getRoundMessage(roundCount)}
        </p>
      </div>

      {/* Players who matched */}
      <div className="animate-slide-up mt-4 z-10" style={{ animationDelay: "0.7s" }} dir="rtl">
        <p className="text-white/70 text-lg font-medium text-center">
          <span>{"\u200Fכל הכבוד\u200F!"}</span> <span>{"\u{1F44F}"}</span>
        </p>
        <p className="text-white/50 text-sm text-center mt-1">
          {player1?.nickname || "?"} ו-{player2?.nickname || "?"} חשבו אותו דבר
        </p>
      </div>

      {/* New game button */}
      {showNewGame && (
        <div className="animate-slide-up mt-8 z-10">
          <button
            onClick={() => router.push("/")}
            dir="rtl"
            className="btn-3d rounded-2xl px-8 py-4 text-xl font-bold
                       bg-kahoot-green text-white
                       hover:brightness-110 active:scale-[0.97]
                       transition-all duration-150"
          >
            <span>{"\u200Fמשחק חדש\u200F?"}</span>{" "}
            <span>{"\u{1F504}"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
