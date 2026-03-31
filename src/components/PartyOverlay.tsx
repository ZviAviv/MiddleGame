"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { soundManager } from "@/lib/sounds";
import { resetGame } from "@/lib/game-actions";
import type { Player, Round, Submission } from "@/types/game";

interface PartyOverlayProps {
  matchWord: string;
  players: Player[];
  player1Id: string | null;
  player2Id: string | null;
  rounds: Round[];
  submissions: Submission[];
  playerColorMap: Map<string, string>;
  gameCode: string;
}

// --- Game history tracking across rematches ---

interface GameResult {
  roundCount: number;
  matchPlayerIds: string[];
}

const HISTORY_PREFIX = "middlegame_history_";

function getGameHistory(gameCode: string): GameResult[] {
  try {
    const raw = localStorage.getItem(`${HISTORY_PREFIX}${gameCode}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveGameResult(gameCode: string, result: GameResult): GameResult[] {
  const history = getGameHistory(gameCode);
  history.push(result);
  localStorage.setItem(`${HISTORY_PREFIX}${gameCode}`, JSON.stringify(history));
  return history;
}

// --- Compliment messages ---

const SHORT_MESSAGES = [
  "\u200F\u05D4\u05D5\u05E4\u05E8\u05D3\u05EA\u05DD \u05D1\u05DC\u05D9\u05D3\u05D4\u200F?",         // הופרדתם בלידה?
  "\u200F\u05D5\u05D0\u05D5, \u05DB\u05D1\u05E8 \u05D4\u05EA\u05D7\u05DC\u05E0\u05D5 \u05D5\u05DB\u05D1\u05E8 \u05E0\u05D2\u05DE\u05E8\u200F?", // וואו, כבר התחלנו וכבר נגמר?
  "\u200F\u05D5\u05D0\u05D5, \u05DE\u05D4\u05E8\u200F!",                                               // וואו, מהר!
];

const MEDIUM_MESSAGES = [
  "\u200F\u05E2\u05D1\u05D5\u05D3\u05EA \u05E6\u05D5\u05D5\u05EA \u05DE\u05E2\u05D5\u05DC\u05D4\u200F!", // עבודת צוות מעולה!
];

const LONG_MESSAGES = [
  "\u200F\u05EA\u05D5\u05D3\u05D4 \u05DC\u05D0\u05DC\u200F!",                                         // תודה לאל!
  "\u200F\u05DB\u05DC \u05D4\u05DB\u05D1\u05D5\u05D3 \u05E2\u05DC \u05D4\u05D4\u05EA\u05DE\u05D3\u05D4\u200F!", // כל הכבוד על ההתמדה!
  "\u200F\u05D6\u05D4 \u05D4\u05D9\u05D4 \u05DE\u05E1\u05E2 \u05D0\u05E8\u05D5\u05DA \u05D5\u05DE\u05E9\u05DE\u05E2\u05D5\u05EA\u05D9", // זה היה מסע ארוך ומשמעותי
  "\u200F\u05D4\u05D3\u05E8\u05DA \u05D4\u05D9\u05D9\u05EA\u05D4 \u05E9\u05D5\u05D5\u05D4 \u05D0\u05EA \u05D6\u05D4\u200F!", // הדרך הייתה שווה את זה!
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRoundMessage(
  roundCount: number,
  gameNumber: number,
  isNewShortest: boolean,
): string {
  // From game 3+: if this is the new shortest, highlight it
  if (gameNumber >= 3 && isNewShortest) {
    return "\u200F\u{1F3C6} \u05E9\u05D9\u05D0 \u05D7\u05D3\u05E9\u200F! \u05D4\u05E1\u05D9\u05D1\u05D5\u05D1 \u05D4\u05DB\u05D9 \u05E7\u05E6\u05E8 \u05E2\u05D3 \u05E2\u05DB\u05E9\u05D9\u05D5\u200F!"; // 🏆 שיא חדש! הסיבוב הכי קצר עד עכשיו!
  }
  if (roundCount <= 2) return "\u200F\u05D8\u05DC\u05E4\u05EA\u05D9\u05D4\u200F!!!!"; // טלפתיה!!!!
  if (roundCount <= 4) return pickRandom(SHORT_MESSAGES);
  if (roundCount <= 8) return pickRandom(MEDIUM_MESSAGES);
  return pickRandom(LONG_MESSAGES);
}

export default function PartyOverlay({
  matchWord,
  players,
  player1Id,
  player2Id,
  rounds,
  submissions,
  playerColorMap,
  gameCode,
}: PartyOverlayProps) {
  const router = useRouter();
  const [showNewGame, setShowNewGame] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [partyStarted, setPartyStarted] = useState(false);
  const [resetting, setResetting] = useState(false);
  const confettiFired = useRef(false);
  const savedRef = useRef(false);

  // Save this game result to history and compute stats
  const { history, gameNumber, isNewShortest, shortestRounds, longestRounds, topMiddlePlayers } = useMemo(() => {
    const matchIds = [player1Id, player2Id].filter(Boolean) as string[];
    const result: GameResult = { roundCount: rounds.length, matchPlayerIds: matchIds };

    let allHistory: GameResult[];
    if (!savedRef.current) {
      savedRef.current = true;
      allHistory = saveGameResult(gameCode, result);
    } else {
      allHistory = getGameHistory(gameCode);
    }

    const num = allHistory.length;
    const pastHistory = allHistory.slice(0, -1); // all games except current

    // Shortest & longest across all games
    const allRoundCounts = allHistory.map((g) => g.roundCount);
    const shortest = Math.min(...allRoundCounts);
    const longest = Math.max(...allRoundCounts);
    const currentIsNewShortest = pastHistory.length >= 2 && rounds.length < Math.min(...pastHistory.map((g) => g.roundCount));

    // Player who hit the middle the most (across all games)
    const middleCounts = new Map<string, number>();
    for (const g of allHistory) {
      for (const pid of g.matchPlayerIds) {
        middleCounts.set(pid, (middleCounts.get(pid) || 0) + 1);
      }
    }
    const maxMiddle = Math.max(...middleCounts.values(), 0);
    const topPlayers = [...middleCounts.entries()]
      .filter(([, count]) => count === maxMiddle)
      .map(([pid]) => pid);

    return {
      history: allHistory,
      gameNumber: num,
      isNewShortest: currentIsNewShortest,
      shortestRounds: shortest,
      longestRounds: longest,
      topMiddlePlayers: topPlayers,
      topMiddleCount: maxMiddle,
    };
  }, [gameCode, player1Id, player2Id, rounds.length]);

  const player1 = players.find((p) => p.id === player1Id);
  const player2 = players.find((p) => p.id === player2Id);
  const roundCount = rounds.length;

  // First round starting words — derive from submissions
  const firstRound = rounds[0];
  const firstRoundSubs = firstRound
    ? submissions
        .filter((s) => s.round_id === firstRound.id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    : [];
  const startSub1 = firstRoundSubs[0];
  const startSub2 = firstRoundSubs[1];
  const startWord1 = startSub1?.word_raw || startSub1?.word;
  const startWord2 = startSub2?.word_raw || startSub2?.word;
  const startPlayer1 = startSub1 ? players.find((p) => p.id === startSub1.player_id) : undefined;
  const startPlayer2 = startSub2 ? players.find((p) => p.id === startSub2.player_id) : undefined;
  const startColor1 = playerColorMap.get(startSub1?.player_id || "") || "#6c5ce7";
  const startColor2 = playerColorMap.get(startSub2?.player_id || "") || "#00b4d8";

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

      {/* Starting words → matching word journey */}
      <div className="relative mt-4 z-10 flex items-center justify-center gap-3 px-4 w-full max-w-sm">
        {/* First round - word 1 */}
        {startWord1 && (
          <div className="animate-slide-up flex-shrink-0" style={{ animationDelay: "0.2s" }}>
            <div
              className="rounded-2xl px-3 py-4 text-center
                         shadow-[0_4px_0_rgba(0,0,0,0.25)]
                         min-h-[64px] flex flex-col items-center justify-center"
              style={{ backgroundColor: startColor1 }}
            >
              <span className="text-sm font-bold text-white drop-shadow-sm break-words leading-tight">
                {startWord1}
              </span>
            </div>
            <p className="text-center text-xs text-white/40 mt-1 truncate">
              {startPlayer1?.nickname || "?"}
            </p>
          </div>
        )}

        {/* The matching word (center, larger) */}
        <div className="animate-bounce-in flex-shrink-0" style={{ animationDelay: "0.3s" }}>
          <div className="bg-kahoot-gold rounded-3xl px-8 py-5
                          shadow-[0_6px_0_rgba(0,0,0,0.3)]
                          border-2 border-white/20
                          animate-glow-pulse">
            <span className="text-2xl font-black text-kahoot-purple-dark">
              {matchWord}
            </span>
          </div>
        </div>

        {/* First round - word 2 */}
        {startWord2 && (
          <div className="animate-slide-up flex-shrink-0" style={{ animationDelay: "0.4s" }}>
            <div
              className="rounded-2xl px-3 py-4 text-center
                         shadow-[0_4px_0_rgba(0,0,0,0.25)]
                         min-h-[64px] flex flex-col items-center justify-center"
              style={{ backgroundColor: startColor2 }}
            >
              <span className="text-sm font-bold text-white drop-shadow-sm break-words leading-tight">
                {startWord2}
              </span>
            </div>
            <p className="text-center text-xs text-white/40 mt-1 truncate">
              {startPlayer2?.nickname || "?"}
            </p>
          </div>
        )}
      </div>

      {/* Round counter */}
      <div className="animate-slide-up mt-5 z-10" style={{ animationDelay: "0.5s" }} dir="rtl">
        <p className="text-white/80 text-lg font-bold text-center">
          {"\u200F\u05D4\u05D2\u05E2\u05EA\u05DD \u05DC\u05D0\u05DE\u05E6\u05E2 \u05D1-"}
          <span className="text-3xl font-black text-kahoot-gold mx-1">{roundCount}</span>
          {"\u200F\u05EA\u05D5\u05E8\u05D5\u05EA\u200F!"}
        </p>
        <p className="text-kahoot-gold/80 text-base font-bold text-center mt-1">
          {getRoundMessage(roundCount, gameNumber, isNewShortest)}
        </p>
      </div>

      {/* Players who matched */}
      <div className="animate-slide-up mt-4 z-10" style={{ animationDelay: "0.7s" }} dir="rtl">
        <p className="text-white/70 text-lg font-medium text-center">
          <span>{"\u200F\u05DB\u05DC \u05D4\u05DB\u05D1\u05D5\u05D3\u200F!"}</span> <span>{"\u{1F44F}"}</span>
        </p>
        <p className="text-white/50 text-sm text-center mt-1">
          {player1?.nickname || "?"} {"\u05D5-"}{player2?.nickname || "?"} {"\u05D7\u05E9\u05D1\u05D5 \u05D0\u05D5\u05EA\u05D5 \u05D3\u05D1\u05E8"}
        </p>
      </div>

      {/* Session stats — shown from game 2+ */}
      {gameNumber >= 2 && (
        <div className="animate-slide-up mt-5 z-10 w-full max-w-xs px-4" style={{ animationDelay: "0.9s" }} dir="rtl">
          <div className="bg-white/8 border border-white/10 rounded-2xl px-4 py-3 space-y-2">
            <p className="text-white/50 text-xs font-bold text-center mb-2">
              {"\u200F\u{1F4CA} \u05E1\u05D8\u05D8\u05D9\u05E1\u05D8\u05D9\u05E7\u05D5\u05EA \u05DE\u05E9\u05D7\u05E7 "}{gameNumber}
            </p>

            {/* Shortest / Longest — from game 3+ */}
            {gameNumber >= 3 && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">{"\u200F\u05D4\u05E1\u05D9\u05D1\u05D5\u05D1 \u05D4\u05DB\u05D9 \u05E7\u05E6\u05E8"}</span>
                  <span className="text-kahoot-green font-bold text-sm">
                    {shortestRounds} {"\u05EA\u05D5\u05E8\u05D5\u05EA"} {"\u26A1"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">{"\u200F\u05D4\u05E1\u05D9\u05D1\u05D5\u05D1 \u05D4\u05DB\u05D9 \u05D0\u05E8\u05D5\u05DA"}</span>
                  <span className="text-kahoot-pink font-bold text-sm">
                    {longestRounds} {"\u05EA\u05D5\u05E8\u05D5\u05EA"} {"\u{1F422}"}
                  </span>
                </div>
              </>
            )}

            {/* Best middle player */}
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">{"\u200F\u05E7\u05D5\u05DC\u05E2 \u05DC\u05D0\u05DE\u05E6\u05E2"}</span>
              <span className="text-kahoot-gold font-bold text-sm">
                {topMiddlePlayers.map((pid) => {
                  const p = players.find((pl) => pl.id === pid);
                  return p?.nickname || "?";
                }).join(" \u05D5-")} {"\u{1F3AF}"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {showNewGame && (
        <div className="animate-slide-up mt-8 z-10 flex flex-col gap-3 w-full max-w-xs px-4">
          <button
            onClick={async () => {
              setResetting(true);
              await resetGame(gameCode);
              setResetting(false);
            }}
            disabled={resetting}
            dir="rtl"
            className="btn-3d w-full rounded-2xl px-8 py-4 text-xl font-bold
                       bg-kahoot-green text-white
                       hover:brightness-110 active:scale-[0.97]
                       disabled:opacity-50
                       transition-all duration-150"
          >
            {resetting
              ? "..."
              : <span><span>{"\u200F\u05E9\u05D7\u05E7\u05D5 \u05E9\u05D5\u05D1"}</span> <span>{"\u{1F91D}"}</span></span>
            }
          </button>
          <button
            onClick={() => router.push("/")}
            dir="rtl"
            className="rounded-2xl px-8 py-3 text-base font-bold
                       bg-white/10 text-white/70
                       hover:bg-white/20 hover:text-white
                       active:scale-[0.97]
                       transition-all duration-150"
          >
            <span>{"\u200Fחזרה לדף הבית"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
