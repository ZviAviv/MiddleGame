"use client";

import { useState, useRef, useEffect } from "react";
import { submitWord, generateStartingWords } from "@/lib/game-actions";
import { soundManager } from "@/lib/sounds";
import { normalizeWord } from "@/lib/utils";

interface InputAreaProps {
  gameId: string;
  playerId: string;
  canSubmit: boolean;
  hasSubmitted: boolean;
  isFinished: boolean;
  isLobby: boolean;
  roundNumber: number;
  isRoundComplete: boolean;
  usedWords: Set<string>;
  isCreator: boolean;
  playerIds: string[];
  onSubmitted?: () => void;
}

export default function InputArea({
  gameId,
  playerId,
  canSubmit,
  hasSubmitted,
  isFinished,
  isLobby,
  roundNumber,
  isRoundComplete,
  usedWords,
  isCreator,
  playerIds,
  onSubmitted,
}: InputAreaProps) {
  const [word, setWord] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [duplicateError, setDuplicateError] = useState(false);
  const [generating, setGenerating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevCanSubmitRef = useRef(canSubmit);

  // Re-focus input when a new round starts (canSubmit goes from false to true)
  useEffect(() => {
    if (canSubmit && !prevCanSubmitRef.current) {
      setJustSubmitted(false);
      setWord("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
    prevCanSubmitRef.current = canSubmit;
  }, [canSubmit]);

  // Clear waiting state when the current round completes (both words submitted).
  // This is the primary fix for the second-to-submit player: React 18 batches
  // the submission INSERT and round UPDATE events into one render, so canSubmit
  // never transitions false→true for them, leaving justSubmitted stuck.
  useEffect(() => {
    if (isRoundComplete && justSubmitted) {
      setJustSubmitted(false);
      setWord("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isRoundComplete, justSubmitted]);

  if (isFinished) return null;

  const handleSubmit = async () => {
    if (!word.trim() || submitting || !canSubmit) return;

    // Check for duplicate word
    const normalized = normalizeWord(word.trim());
    if (usedWords.has(normalized)) {
      setDuplicateError(true);
      setTimeout(() => setDuplicateError(false), 2500);
      return;
    }

    setDuplicateError(false);
    setSubmitting(true);
    soundManager?.play("whoosh");

    const result = await submitWord(gameId, playerId, word.trim());

    setSubmitting(false);

    if (result.error) {
      if (result.error === "already_submitted") {
        setJustSubmitted(true);
      }
      return;
    }

    setJustSubmitted(true);
    setWord("");
    // Trigger a refresh so the game state updates immediately
    onSubmitted?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleGenerateWords = async () => {
    if (generating) return;
    setGenerating(true);
    soundManager?.play("whoosh");

    const result = await generateStartingWords(gameId, playerId);
    setGenerating(false);

    if ("error" in result) {
      console.error("Generate words failed:", result.error);
      return;
    }
    onSubmitted?.();
  };

  const showGenerateButton = isLobby && isCreator && !justSubmitted;

  const isWaiting = hasSubmitted || justSubmitted;

  const getPlaceholder = () => {
    if (isLobby || roundNumber <= 1) {
      return "\u200Fכתבו מילה כדי להתחיל";
    }
    return "\u200Fמה המילה שבאמצע\u200F?";
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 overflow-hidden shadow-[0_-8px_30px_rgba(0,0,0,0.3)]">
      {/* Strong visual separator */}
      <div className="h-1.5 bg-gradient-to-l from-kahoot-pink via-kahoot-gold to-kahoot-blue shadow-[0_-4px_16px_rgba(255,215,0,0.3)]" />

      {isWaiting ? (
        <div className="bg-kahoot-purple-dark/95 backdrop-blur-md px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] text-center animate-pop-in"
             dir="rtl" role="status">
          <p className="text-white/70 font-bold text-xl py-4">
            <span>{"\u200Fמה תהיה המילה הבאה\u200F?"}</span>
          </p>
          <div className="flex justify-center gap-1.5 mt-3 pb-4">
            <div className="w-3 h-3 rounded-full bg-kahoot-pink animate-bounce" style={{ animationDelay: "0s" }} />
            <div className="w-3 h-3 rounded-full bg-kahoot-gold animate-bounce" style={{ animationDelay: "0.15s" }} />
            <div className="w-3 h-3 rounded-full bg-kahoot-blue animate-bounce" style={{ animationDelay: "0.3s" }} />
          </div>
        </div>
      ) : (
        <div className="bg-white/95 backdrop-blur-lg px-3 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          {duplicateError && (
            <p className="text-center text-kahoot-red font-bold text-sm mb-2 animate-bounce-in" dir="rtl">
              {"\u200F\u05D4\u05DE\u05D9\u05DC\u05D4 \u05DB\u05D1\u05E8 \u05D4\u05D5\u05E4\u05D9\u05E2\u05D4 \u05D1\u05EA\u05D5\u05E8 \u05D4\u05E0\u05D5\u05DB\u05D7\u05D9"}
            </p>
          )}
          {showGenerateButton && (
            <>
              <button
                onClick={handleGenerateWords}
                disabled={generating}
                className="w-full mb-3 rounded-2xl px-4 py-3 text-base font-bold
                           bg-kahoot-purple/10 border-2 border-dashed border-kahoot-purple/30
                           text-kahoot-purple hover:bg-kahoot-purple/15
                           disabled:opacity-50 transition-all duration-150"
                dir="rtl"
              >
                {generating
                  ? <span>{"\u23F3"} {"\u200F\u05D9\u05D5\u05E6\u05E8 \u05DE\u05D9\u05DC\u05D9\u05DD..."}</span>
                  : <span>{"\u200F\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u05E2\u05DD \u05DE\u05D9\u05DC\u05D9\u05DD \u05D0\u05E7\u05E8\u05D0\u05D9\u05D5\u05EA"} <span>{"\u{1F3B2}"}</span></span>
                }
              </button>
            </>
          )}
          <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            maxLength={50}
            disabled={!canSubmit || submitting}
            className="flex-1 min-w-0 rounded-2xl px-4 py-4 text-lg font-bold text-center
                       bg-white border-3 border-kahoot-purple/20 text-kahoot-purple-dark
                       placeholder-kahoot-purple/70 outline-none
                       transition-all duration-200
                       focus:border-kahoot-gold focus:shadow-[0_0_0_4px_rgba(255,215,0,0.3)]
                       disabled:opacity-30 disabled:cursor-not-allowed"
            dir="rtl"
            autoComplete="off"
          />
          <button
            onClick={handleSubmit}
            disabled={!word.trim() || !canSubmit || submitting}
            className="btn-3d rounded-2xl px-5 py-4 text-lg font-black shrink-0
                       bg-kahoot-green text-white
                       hover:brightness-110 active:scale-[0.95]
                       disabled:opacity-25 disabled:cursor-not-allowed
                       transition-all duration-150 whitespace-nowrap
                       shadow-lg"
            dir="rtl"
            aria-label="שלחו מילה"
          >
            {submitting ? "..." : <span><span>{"\u200Fשלחו"}</span> <span>{"\u{1F680}"}</span></span>}
          </button>
          </div>
        </div>
      )}
    </div>
  );
}
