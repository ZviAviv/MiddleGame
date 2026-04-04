"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGame } from "@/lib/use-game";
import { usePresence } from "@/lib/use-presence";
import { useSession } from "@/lib/use-session";
import { createClient } from "@/lib/supabase/client";
import { soundManager } from "@/lib/sounds";
import { buildPlayerColorMap, normalizeWord } from "@/lib/utils";
import Lobby from "@/components/Lobby";
import GameBoard from "@/components/GameBoard";
import InputArea from "@/components/InputArea";
import PlayerList from "@/components/PlayerList";
import SoundToggle from "@/components/SoundToggle";
import PartyOverlay from "@/components/PartyOverlay";
import HowToPlay from "@/components/HowToPlay";
import Chat from "@/components/Chat";

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
  const [showParty, setShowParty] = useState(false);

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
  const onlinePlayerIds = usePresence(code, playerId);

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

  // Auto-join if player has a saved nickname but no player ID for this game
  // Allow joining both lobby and active games (late joiners welcome!)
  useEffect(() => {
    if (!playerId && !joining && nickname && clientId && game && game.status !== "finished") {
      const doAutoJoin = async () => {
        setJoining(true);
        const supabase = createClient();

        // Check if reconnecting (already have a player with this client_id)
        const { data: existing } = await supabase
          .from("players")
          .select("id")
          .eq("game_id", game.id)
          .eq("client_id", clientId)
          .maybeSingle();

        // If not reconnecting, check 2-player limit
        if (!existing) {
          const { count } = await supabase
            .from("players")
            .select("id", { count: "exact", head: true })
            .eq("game_id", game.id);
          if ((count ?? 0) >= 2) {
            setJoining(false);
            setError("\u200F\u05D4\u05DE\u05E9\u05D7\u05E7 \u05DE\u05DC\u05D0");
            return;
          }
        }

        const { data: player } = await supabase
          .from("players")
          .upsert(
            { game_id: game.id, nickname: nickname.trim(), client_id: clientId },
            { onConflict: "game_id,client_id" }
          )
          .select()
          .single();
        if (player) {
          setPlayerId(player.id);
          setGameId(game.id);
          localStorage.setItem(`middlegame_player_${code}`, player.id);
        }
        setJoining(false);
      };
      doAutoJoin();
    }
  }, [playerId, joining, nickname, clientId, game, code]);

  const [showHelp, setShowHelp] = useState(false);

  // Play sounds on events
  const prevPlayersCountRef = useRef(0);
  const prevRoundsCountRef = useRef(0);
  const lastSoundedRoundIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (players.length > prevPlayersCountRef.current && prevPlayersCountRef.current > 0) {
      soundManager?.play("join");
    }
    prevPlayersCountRef.current = players.length;
  }, [players.length]);

  const lastRound = rounds[rounds.length - 1];
  const lastRoundComplete = lastRound?.is_complete;

  useEffect(() => {
    if (lastRound?.is_complete && lastSoundedRoundIdRef.current !== lastRound.id) {
      soundManager?.play("pop");
      lastSoundedRoundIdRef.current = lastRound.id;
    }
    if (rounds.length > prevRoundsCountRef.current) {
      prevRoundsCountRef.current = rounds.length;
    }
  }, [rounds.length, lastRoundComplete, lastRound?.id]);

  // Delayed party reveal — show cards with a glow first, then trigger the overlay
  const isGameFinished = phase === "finished" && currentRound?.is_match;
  useEffect(() => {
    if (isGameFinished) {
      // 1.2s delay: lets players see both words + glow before the party explodes
      const timer = setTimeout(() => setShowParty(true), 2500);
      return () => clearTimeout(timer);
    } else {
      setShowParty(false);
    }
  }, [isGameFinished]);

  // Background tab notifications — nudge when new submissions arrive while tab is hidden
  const bgSubmissionCountRef = useRef(submissions.length);
  const titleFlashRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitle = "\u05DE\u05E9\u05D7\u05E7 \u05D4\u05D0\u05DE\u05E6\u05E2";

  // Clean up title flash on unmount
  useEffect(() => {
    return () => {
      if (titleFlashRef.current) clearInterval(titleFlashRef.current);
      document.title = originalTitle;
    };
  }, [originalTitle]);

  // Stop flashing when tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        if (titleFlashRef.current) {
          clearInterval(titleFlashRef.current);
          titleFlashRef.current = null;
        }
        document.title = originalTitle;
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [originalTitle]);

  // Detect new submissions while tab is hidden
  useEffect(() => {
    if (submissions.length > bgSubmissionCountRef.current && bgSubmissionCountRef.current > 0) {
      if (document.visibilityState === "hidden") {
        // Play nudge sound
        soundManager?.play("nudge");

        // Flash document title
        if (!titleFlashRef.current) {
          let on = true;
          titleFlashRef.current = setInterval(() => {
            document.title = on ? "\u200F\u2757 \u05EA\u05D5\u05E8\u05DB\u05DD\u200F!" : originalTitle;
            on = !on;
          }, 1000);
        }
      }
    }
    bgSubmissionCountRef.current = submissions.length;
  }, [submissions.length, originalTitle]);

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
    if (!clientId || !game) return;

    setJoining(true);
    setError("");
    setNickname(nicknameInput.trim());

    const supabase = createClient();

    // Check if reconnecting (already have a player with this client_id)
    const { data: existing } = await supabase
      .from("players")
      .select("id")
      .eq("game_id", game.id)
      .eq("client_id", clientId)
      .maybeSingle();

    // If not reconnecting, check 2-player limit
    if (!existing) {
      const { count } = await supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("game_id", game.id);
      if ((count ?? 0) >= 2) {
        setError("\u200F\u05D4\u05DE\u05E9\u05D7\u05E7 \u05DE\u05DC\u05D0");
        setJoining(false);
        return;
      }
    }

    const { data: player, error: playerError } = await supabase
      .from("players")
      .upsert(
        { game_id: game.id, nickname: nicknameInput.trim(), client_id: clientId },
        { onConflict: "game_id,client_id" }
      )
      .select()
      .single();

    if (playerError || !player) {
      setError(playerError?.message || "\u200Fלא הצלחנו להצטרף");
      setJoining(false);
      return;
    }

    setPlayerId(player.id);
    setGameId(game.id);
    localStorage.setItem(`middlegame_player_${code}`, player.id);
    setJoining(false);
  };

  // Determine if current player is the game creator (first player by join order)
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.joined_at.localeCompare(b.joined_at)),
    [players]
  );
  const isCreator = sortedPlayers.length > 0 && sortedPlayers[0].id === playerId;
  const playerIds = useMemo(() => sortedPlayers.map((p) => p.id), [sortedPlayers]);

  // Current round submissions (for player status indicators)
  const currentRoundSubs = currentRound
    ? submissions.filter((s) => s.round_id === currentRound.id)
    : [];

  // Use is_complete (set by RPC for ALL rounds) instead of word1/word2
  // (which are only set for matching rounds).
  const isCurrentRoundComplete = !!currentRound?.is_complete;

  // Set of normalized words already used in completed rounds (for duplicate prevention).
  // Only count words from rounds where both players submitted — otherwise player 2
  // would be blocked from matching player 1's word in the current round.
  const usedWords = useMemo(() => {
    const completedRoundIds = new Set(
      rounds.filter((r) => r.is_complete).map((r) => r.id)
    );
    return new Set(
      submissions
        .filter((s) => completedRoundIds.has(s.round_id))
        .map((s) => normalizeWord(s.word))
    );
  }, [submissions, rounds]);

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
            placeholder={"\u200F\u05D0\u05D9\u05DA \u05E7\u05D5\u05E8\u05D0\u05D9\u05DD \u05DC\u05DA\u200F?"}
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


  // Lobby phase
  if (phase === "lobby") {
    return (
      <div className="flex flex-col h-dvh overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => router.push("/")}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-kahoot-gold focus-visible:outline-none transition-colors text-white/60 hover:text-white"
              title={"\u05D7\u05D6\u05E8\u05D4 \u05DC\u05D3\u05E3 \u05D4\u05D1\u05D9\u05EA"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M11.47 3.841a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.061l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.689z" />
                <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15.75a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a.75.75 0 01.091-.086L12 5.432z" />
              </svg>
            </button>
            <SoundToggle />
            <button
              onClick={() => setShowHelp(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-kahoot-gold focus-visible:outline-none transition-colors text-white/60 hover:text-white"
              title={"\u05D0\u05D9\u05DA \u05DE\u05E9\u05D7\u05E7\u05D9\u05DD?"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.37-1.028.72-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-1.91 1.69-2.252.241-.131.444-.274.597-.428.801-.7.801-1.837 0-2.537zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3" dir="rtl">
            <span className="text-sm text-white/50 font-medium">{"\u200F\u05E7\u05D5\u05D3 \u05DE\u05E9\u05D7\u05E7"}</span>
            <span className="text-lg font-black text-kahoot-gold">{code}</span>
            <button
              onClick={handleCopyUrl}
              className="text-sm font-bold text-white/70 hover:text-white
                         bg-white/10 hover:bg-white/20 rounded-full px-3 py-1
                         transition-all duration-150"
              dir="rtl"
            >
              {urlCopied
                ? <span>{"\u200F\u05D4\u05D5\u05E2\u05EA\u05E7\u200F!"}</span>
                : <span>{"\u200F\u05E9\u05EA\u05E4\u05D5"}</span>
              }
            </button>
          </div>
        </div>

        <Lobby
          code={code}
          players={players}
          currentPlayerId={playerId}
          playerColorMap={playerColorMap}
          onlinePlayerIds={onlinePlayerIds}
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
            isRoundComplete={false}
            usedWords={usedWords}
            isCreator={isCreator}
            playerIds={playerIds}
            onSubmitted={refresh}
          />
        )}
        {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
      </div>
    );
  }

  // Active game / Finished
  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      {/* Top bar — game code with share button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => router.push("/")}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-kahoot-gold focus-visible:outline-none transition-colors text-white/60 hover:text-white"
            title={"\u05D7\u05D6\u05E8\u05D4 \u05DC\u05D3\u05E3 \u05D4\u05D1\u05D9\u05EA"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M11.47 3.841a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.061l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.689z" />
              <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15.75a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a.75.75 0 01.091-.086L12 5.432z" />
            </svg>
          </button>
          <SoundToggle />
          <button
            onClick={() => setShowHelp(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-kahoot-gold focus-visible:outline-none transition-colors text-white/60 hover:text-white"
            title={"\u05D0\u05D9\u05DA \u05DE\u05E9\u05D7\u05E7\u05D9\u05DD?"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.37-1.028.72-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-1.91 1.69-2.252.241-.131.444-.274.597-.428.801-.7.801-1.837 0-2.537zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3" dir="rtl">
          <span className="text-sm text-white/50 font-medium">{"\u200F\u05E7\u05D5\u05D3 \u05DE\u05E9\u05D7\u05E7"}</span>
          <span className="text-lg font-black text-kahoot-gold">{code}</span>
          <button
            onClick={handleCopyUrl}
            className="text-sm font-bold text-white/70 hover:text-white
                       bg-white/10 hover:bg-white/20 rounded-full px-3 py-1
                       transition-all duration-150"
            dir="rtl"
          >
            {urlCopied
              ? <span>{"\u200F\u05D4\u05D5\u05E2\u05EA\u05E7\u200F!"}</span>
              : <span>{"\u200F\u05E9\u05EA\u05E4\u05D5"}</span>
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
          onlinePlayerIds={onlinePlayerIds}
        />
      </div>

      {/* Game board */}
      <GameBoard
        rounds={rounds}
        players={players}
        playerColorMap={playerColorMap}
        submissions={submissions}
      />

      {/* Chat */}
      {gameId && (
        <Chat
          gameId={gameId}
          playerId={playerId}
          players={players}
          playerColorMap={playerColorMap}
        />
      )}

      {/* Party overlay when game is finished — delayed for dramatic reveal */}
      {showParty && currentRound?.is_match && (
        <PartyOverlay
          matchWord={currentRound.word1_raw || currentRound.word1 || ""}
          players={players}
          player1Id={currentRound.player1_id}
          player2Id={currentRound.player2_id}
          rounds={rounds}
          submissions={submissions}
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
          isRoundComplete={isCurrentRoundComplete}
          usedWords={usedWords}
          isCreator={isCreator}
          playerIds={playerIds}
          onSubmitted={refresh}
        />
      )}
      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
    </div>
  );
}
