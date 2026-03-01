"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGame } from "@/lib/use-game";
import { useSession } from "@/lib/use-session";
import { joinGame } from "@/lib/game-actions";
import { soundManager } from "@/lib/sounds";
import { buildPlayerColorMap } from "@/lib/utils";
import Lobby from "@/components/Lobby";
import GameBoard from "@/components/GameBoard";
import InputArea from "@/components/InputArea";
import PlayerList from "@/components/PlayerList";
import SoundToggle from "@/components/SoundToggle";
import PartyOverlay from "@/components/PartyOverlay";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string) || "";
  const { clientId, nickname, setNickname } = useSession();

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [error, setError] = useState("");
  const [urlCopied, setUrlCopied] = useState(false);

  const {
    game,
    players,
    rounds,
    submissions,
    currentRound,
    phase,
    canSubmit,
    hasSubmittedThisRound,
    loading,
    refresh,
  } = useGame(code, playerId);

  // Build persistent player color map
  const playerColorMap = useMemo(() => buildPlayerColorMap(players), [players]);

  // Try to recover player ID from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`middlegame_player_${code}`);
    if (stored) setPlayerId(stored);
  }, [code]);

  // Sync game ID from game state
  useEffect(() => {
    if (game?.id) setGameId(game.id);
  }, [game?.id]);

  // Pre-fill nickname
  useEffect(() => {
    if (nickname) setNicknameInput(nickname);
  }, [nickname]);

  // Auto-redirect when a rematch game is created (next_game_code appears)
  useEffect(() => {
    if (game?.next_game_code) {
      router.push(`/game/${game.next_game_code.trim()}`);
    }
  }, [game?.next_game_code, router]);

  // Auto-join if player has a saved nickname but no player ID for this game
  useEffect(() => {
    if (!playerId && !joining && nickname && clientId && game && game.status === "lobby") {
      const doAutoJoin = async () => {
        setJoining(true);
        const result = await joinGame(code, nickname, clientId);
        if (!("error" in result)) {
          setPlayerId(result.playerId);
          setGameId(result.gameId);
          localStorage.setItem(`middlegame_player_${code}`, result.playerId);
        }
        setJoining(false);
      };
      doAutoJoin();
    }
  }, [playerId, joining, nickname, clientId, game?.status, code]);

  // Play sounds on events
  const prevPlayersCountRef = useState(0);
  const prevRoundsRef = useState(0);

  useEffect(() => {
    if (players.length > prevPlayersCountRef[0] && prevPlayersCountRef[0] > 0) {
      soundManager?.play("join");
    }
    prevPlayersCountRef[0] = players.length;
  }, [players.length]);

  useEffect(() => {
    const lastRound = rounds[rounds.length - 1];
    if (lastRound?.word2 && rounds.length >= prevRoundsRef[0]) {
      soundManager?.play("pop");
    }
    if (rounds.length > prevRoundsRef[0]) {
      prevRoundsRef[0] = rounds.length;
    }
  }, [rounds]);

  const handleCopyUrl = async () => {
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/game/${code}`
      : "";
    try {
      if (navigator.share) {
        await navigator.share({
          title: "\u200Fמשחק האמצע",
          text: `\u200Fבואו לשחק איתנו משחק האמצע!\n\u200Fקוד: ${code}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
      }
    } catch {
      // User cancelled
    }
  };

  // Handle joining when player has no ID yet
  const handleJoin = async () => {
    if (!nicknameInput.trim()) {
      setError("\u200Fצריך שם\u200F!");
      return;
    }
    if (!clientId) return;

    setJoining(true);
    setError("");
    setNickname(nicknameInput.trim());

    const result = await joinGame(code, nicknameInput.trim(), clientId);
    if ("error" in result) {
      if (result.error === "game_not_found") {
        setError("\u200Fלא נמצא משחק עם הקוד הזה");
      } else {
        setError(result.error);
      }
      setJoining(false);
      return;
    }

    setPlayerId(result.playerId);
    setGameId(result.gameId);
    localStorage.setItem(`middlegame_player_${code}`, result.playerId);
    setJoining(false);
  };

  // Loading state
  if (loading && !game) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="text-center animate-fade-scale-in" dir="rtl">
          <p className="text-4xl mb-3"><span>{"\u{1F3AF}"}</span></p>
          <p className="text-white/60 font-medium">{"\u200Fטוען משחק..."}</p>
        </div>
      </div>
    );
  }

  // Game not found
  if (!loading && !game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 gap-4 animate-fade-scale-in" dir="rtl">
        <p className="text-4xl"><span>{"\u{1F937}"}</span></p>
        <p className="text-xl font-bold text-white/80">{"\u200Fלא נמצא משחק"}</p>
        <button
          onClick={() => router.push("/")}
          className="btn-3d rounded-2xl px-6 py-3 text-lg font-bold bg-kahoot-blue text-white"
        >
          {"\u200Fחזרה לדף הבית"}
        </button>
      </div>
    );
  }

  // Need to join (no player ID stored)
  if (!playerId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 gap-6 animate-fade-scale-in">
        <div className="text-center animate-bounce-in" dir="rtl">
          <h1 className="text-3xl font-black mb-2">
            <span>{"\u200Fמשחק האמצע"}</span>{" "}
            <span>{"\u{1F3AF}"}</span>
          </h1>
          <p className="text-white/60">
            <span>{"\u200Fקוד משחק: "}</span><span className="font-bold text-white/80" dir="ltr">{code}</span>
          </p>
        </div>

        <div className="w-full max-w-xs space-y-3 animate-slide-up">
          <input
            type="text"
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            placeholder={"\u200Fמה השם שלכם\u200F?"}
            maxLength={20}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            className="w-full rounded-2xl px-5 py-4 text-lg font-bold text-center
                       bg-white/15 border-2 border-white/20 text-white
                       placeholder-white/40 outline-none
                       input-glow transition-all duration-200
                       focus:border-kahoot-gold focus:bg-white/20"
            dir="rtl"
          />
          <button
            onClick={handleJoin}
            disabled={joining}
            dir="rtl"
            className="btn-3d w-full rounded-2xl px-6 py-4 text-xl font-bold
                       bg-kahoot-green text-white
                       hover:brightness-110 active:scale-[0.97]
                       disabled:opacity-50 transition-all duration-150"
          >
            {joining
              ? <span>{"\u23F3..."}</span>
              : <span><span>{"\u200Fהצטרפו למשחק\u200F!"}</span> <span>{"\u{1F3AE}"}</span></span>
            }
          </button>
          {error && (
            <p className="text-center text-kahoot-red font-medium animate-bounce-in" dir="rtl">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // Current round submissions (for player status indicators)
  const currentRoundSubs = currentRound
    ? submissions.filter((s) => s.round_id === currentRound.id)
    : [];

  // Lobby phase
  if (phase === "lobby") {
    return (
      <div className="flex flex-col min-h-dvh">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 backdrop-blur-sm">
          <SoundToggle />
          <span className="text-xs text-white/30 font-mono" dir="ltr">{code}</span>
        </div>

        <Lobby
          code={code}
          players={players}
          currentPlayerId={playerId}
          playerColorMap={playerColorMap}
        />

        {/* Input at bottom for starting the game */}
        {gameId && (
          <InputArea
            gameId={gameId}
            playerId={playerId}
            canSubmit={canSubmit || phase === "lobby"}
            hasSubmitted={hasSubmittedThisRound}
            isFinished={false}
            isLobby={true}
            roundNumber={0}
            onSubmitted={refresh}
          />
        )}
      </div>
    );
  }

  // Active game / Finished
  return (
    <div className="flex flex-col min-h-dvh">
      {/* Top bar — game code with share button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <SoundToggle />

        <div className="flex items-center gap-3" dir="rtl">
          <span className="text-sm text-white/50 font-medium">{"\u200Fקוד משחק"}</span>
          <span className="text-lg font-black text-white tracking-wider" dir="ltr">{code}</span>
          <button
            onClick={handleCopyUrl}
            className="text-sm font-bold text-kahoot-gold hover:text-white
                       bg-white/10 hover:bg-white/20 rounded-full px-3 py-1
                       transition-all duration-150"
            dir="rtl"
          >
            {urlCopied
              ? <span>{"\u200Fהועתק\u200F!"} <span>{"\u2713"}</span></span>
              : <span>{"\u200Fשתפו"} <span>{"\u{1F4CB}"}</span></span>
            }
          </button>
        </div>
      </div>

      {/* Player list (compact) */}
      <div className="px-4 py-2 border-b border-white/5">
        <PlayerList
          players={players}
          currentPlayerId={playerId}
          playerColorMap={playerColorMap}
          currentRoundSubmissions={currentRoundSubs}
        />
      </div>

      {/* Game board */}
      <GameBoard
        rounds={rounds}
        players={players}
        playerColorMap={playerColorMap}
        submissions={submissions}
      />

      {/* Party overlay when game is finished */}
      {phase === "finished" && currentRound?.is_match && (
        <PartyOverlay
          matchWord={currentRound.word1_raw || currentRound.word1 || ""}
          players={players}
          player1Id={currentRound.player1_id}
          player2Id={currentRound.player2_id}
          rounds={rounds}
          playerColorMap={playerColorMap}
          gameCode={code}
        />
      )}

      {/* Input area */}
      {gameId && (
        <InputArea
          gameId={gameId}
          playerId={playerId}
          canSubmit={canSubmit}
          hasSubmitted={hasSubmittedThisRound}
          isFinished={phase === "finished"}
          isLobby={false}
          roundNumber={currentRound?.round_number || 0}
          onSubmitted={refresh}
        />
      )}
    </div>
  );
}
