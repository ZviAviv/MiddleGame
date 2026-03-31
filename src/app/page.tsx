"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/use-session";
import { createClient } from "@/lib/supabase/client";
import { generateGameCode } from "@/lib/utils";
import HowToPlay from "@/components/HowToPlay";

type Mode = "home" | "join";

export default function LandingPage() {
  const router = useRouter();
  const { clientId, nickname: savedNickname, setNickname: saveNickname } = useSession();
  const [mode, setMode] = useState<Mode>("home");
  const [nickname, setNickname] = useState("");
  const [gameCode, setGameCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (savedNickname) setNickname(savedNickname);
  }, [savedNickname]);

  const handleCreate = async () => {
    if (!nickname.trim()) {
      setError("\u200Fקודם כתבו שם\u200F!");
      return;
    }
    setLoading(true);
    setError("");
    saveNickname(nickname.trim());

    // Client-side game creation + join, then navigate
    const supabase = createClient();
    let code = "";
    let gameId = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateGameCode();
      const { data: game, error: gameError } = await supabase
        .from("games")
        .insert({ code })
        .select("id")
        .single();
      if (gameError?.code === "23505") continue;
      if (gameError || !game) {
        setError(gameError?.message || "create_failed");
        setLoading(false);
        return;
      }
      gameId = game.id;
      break;
    }
    if (!gameId) {
      setError("Could not generate unique game code");
      setLoading(false);
      return;
    }

    const { data: player } = await supabase
      .from("players")
      .insert({ game_id: gameId, nickname: nickname.trim(), client_id: clientId })
      .select("id")
      .single();

    if (player) {
      localStorage.setItem(`middlegame_player_${code}`, player.id);
    }

    router.push(`/game/${code}`);
  };

  const handleJoin = async () => {
    if (!nickname.trim()) {
      setError("\u200Fקודם כתבו שם\u200F!");
      return;
    }
    if (!gameCode.trim() || gameCode.trim().length !== 4) {
      setError("\u200Fצריך קוד משחק בן 4 ספרות");
      return;
    }
    setLoading(true);
    setError("");
    saveNickname(nickname.trim());

    // Verify game exists before navigating
    const supabase = createClient();
    const { data: game } = await supabase
      .from("games")
      .select("status")
      .eq("code", gameCode.trim())
      .single();

    if (!game) {
      setError("\u200Fלא נמצא משחק עם הקוד הזה \u{1F937}");
      setLoading(false);
      return;
    }
    if (game.status === "finished") {
      setError("\u200Fהמשחק הזה כבר נגמר");
      setLoading(false);
      return;
    }

    // Navigate — game page auto-joins with saved nickname
    router.push(`/game/${gameCode.trim()}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 py-10">
      {/* Floating background shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-20 right-10 w-20 h-20 rounded-full bg-kahoot-pink/20 blur-sm animate-float" />
        <div className="absolute top-40 left-8 w-14 h-14 rounded-full bg-kahoot-blue/20 blur-sm animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-32 right-16 w-16 h-16 rounded-full bg-kahoot-yellow/20 blur-sm animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-20 left-12 w-12 h-12 rounded-full bg-kahoot-green/20 blur-sm animate-float" style={{ animationDelay: "0.5s" }} />
      </div>

      {/* Title */}
      <div className="text-center mb-10 animate-bounce-in" dir="rtl">
        <h1 className="text-6xl font-black mb-3 drop-shadow-lg text-glow">
          <span>{"\u200Fמשחק האמצע\u200F!"}</span>{" "}
          <span>{"\u{1F3AF}"}</span>
        </h1>
        <p className="text-lg text-white/70 font-medium">
          <span>{"\u200Fהמשחק שבו כולם חושבים באמצע\u200F!"}</span>{" "}
          <span>{"\u{1F9E0}"}</span>
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-sm bg-white/8 backdrop-blur-sm border border-white/10 rounded-3xl p-6 shadow-2xl animate-slide-up">
        {/* Nickname Input */}
        <div className="mb-5">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={"\u200F\u05D0\u05D9\u05DA \u05E7\u05D5\u05E8\u05D0\u05D9\u05DD \u05DC\u05DA\u200F?"}
            maxLength={20}
            className="w-full rounded-2xl px-5 py-4 text-lg font-bold text-center
                       bg-white/15 border-2 border-white/20 text-white
                       placeholder-white/40 outline-none
                       input-glow transition-all duration-200
                       focus:border-kahoot-gold focus:bg-white/20"
            dir="rtl"
          />
        </div>

        {mode === "home" && (
          <div className="space-y-3">
            {/* Create Game Button */}
            <button
              onClick={handleCreate}
              disabled={loading}
              dir="rtl"
              className="btn-3d w-full rounded-2xl px-6 py-4 text-xl font-bold
                         bg-kahoot-green text-white
                         hover:brightness-110 active:scale-[0.97]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-150"
            >
              {loading
                ? <span>{"\u23F3..."}</span>
                : <span><span>{"\u200Fצרו משחק חדש"}</span> <span>{"\u{1F3AE}"}</span></span>
              }
            </button>

            {/* Join Game Button */}
            <button
              onClick={() => setMode("join")}
              dir="rtl"
              className="btn-3d w-full rounded-2xl px-6 py-4 text-xl font-bold
                         bg-kahoot-blue text-white
                         hover:brightness-110 active:scale-[0.97]
                         transition-all duration-150"
            >
              <span>{"\u200Fהצטרפו למשחק"}</span>{" "}
              <span>{"\u{1F517}"}</span>
            </button>
          </div>
        )}

        {mode === "join" && (
          <div className="space-y-3">
            {/* Game Code Input */}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder={"\u200F\u05E7\u05D5\u05D3 \u05DE\u05E9\u05D7\u05E7 (4 \u05E1\u05E4\u05E8\u05D5\u05EA)"}
              maxLength={4}
              className={`w-full rounded-2xl px-5 py-4 text-center
                         bg-white/15 border-2 border-white/20 text-white
                         placeholder:text-base placeholder:font-bold placeholder:tracking-normal
                         placeholder-white/40 outline-none
                         input-glow transition-all duration-200
                         focus:border-kahoot-gold focus:bg-white/20
                         ${gameCode ? "text-2xl font-black tracking-[0.3em]" : "text-base font-bold"}`}
              dir={gameCode ? "ltr" : "rtl"}
            />

            <button
              onClick={handleJoin}
              disabled={loading}
              dir="rtl"
              className="btn-3d w-full rounded-2xl px-6 py-4 text-xl font-bold
                         bg-kahoot-green text-white
                         hover:brightness-110 active:scale-[0.97]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-150"
            >
              {loading
                ? <span>{"\u23F3..."}</span>
                : <span><span>{"\u200Fהצטרפו\u200F!"}</span> <span>{"\u{1F680}"}</span></span>
              }
            </button>

            <button
              onClick={() => { setMode("home"); setError(""); }}
              className="w-full rounded-2xl px-6 py-3 text-base font-medium
                         text-white/60 hover:text-white/90
                         transition-colors duration-150"
              dir="rtl"
            >
              {"\u200Fחזרה \u2190"}
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 text-center text-kahoot-red border border-kahoot-red/30 bg-white/10 rounded-xl px-4 py-2 font-medium animate-bounce-in" dir="rtl">
            {error}
          </div>
        )}
      </div>

      {/* How to Play button */}
      <button
        onClick={() => setShowHelp(true)}
        dir="rtl"
        className="mt-6 text-white/50 hover:text-white/90 text-sm font-medium
                   transition-colors duration-150 animate-slide-up"
      >
        <span>{"\u200F\u05D0\u05D9\u05DA \u05DE\u05E9\u05D7\u05E7\u05D9\u05DD\u200F?"}</span>
      </button>

      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
    </div>
  );
}
