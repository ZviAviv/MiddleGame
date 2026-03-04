"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@/lib/use-chat";
import type { Player } from "@/types/game";

interface ChatProps {
  gameId: string;
  playerId: string;
  players: Player[];
  playerColorMap: Map<string, string>;
}

export default function Chat({
  gameId,
  playerId,
  players,
  playerColorMap,
}: ChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, unreadCount, sendMessage, markRead } = useChat(
    gameId,
    playerId,
    isOpen
  );

  // Auto-scroll on new messages when open
  useEffect(() => {
    if (isOpen && bottomRef.current) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    }
  }, [messages.length, isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      markRead();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, markRead]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    await sendMessage(text);
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const getPlayerName = (pid: string) => {
    return players.find((p) => p.id === pid)?.nickname || "?";
  };

  const getPlayerColor = (pid: string) => {
    return playerColorMap.get(pid) || "#ffffff";
  };

  return (
    <>
      {/* Toggle button — fixed above InputArea */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-[90px] right-4 z-45
                   w-12 h-12 rounded-full
                   bg-white/15 hover:bg-white/25 backdrop-blur-sm
                   border border-white/20
                   flex items-center justify-center
                   transition-all duration-200
                   shadow-lg"
        style={{ zIndex: 45 }}
        aria-label={"\u05E6\u0027\u05D0\u05D8"}
      >
        <span className="text-xl">{"\u{1F4AC}"}</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1
                          bg-kahoot-red rounded-full
                          text-white text-xs font-bold
                          flex items-center justify-center
                          animate-bounce-in">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Chat panel overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-45"
            style={{ zIndex: 45 }}
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div
            className="fixed left-2 right-2 bottom-[90px] z-50
                       max-h-[50dvh] rounded-2xl overflow-hidden
                       bg-kahoot-purple-dark/95 backdrop-blur-md
                       border border-white/15 shadow-2xl
                       flex flex-col animate-fade-scale-in"
            style={{ transformOrigin: "bottom right" }}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5
                           border-b border-white/10 shrink-0">
              <span className="font-bold text-white/80 text-sm">
                {"\u200F\u05E6\u0027\u05D0\u05D8"}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/50 hover:text-white text-lg
                          w-7 h-7 flex items-center justify-center
                          rounded-full hover:bg-white/10 transition-colors"
              >
                {"\u2715"}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
              {messages.length === 0 && (
                <p className="text-center text-white/30 text-sm py-6">
                  {"\u200F\u05D0\u05D9\u05DF \u05D4\u05D5\u05D3\u05E2\u05D5\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF..."}
                </p>
              )}
              {messages.map((msg) => {
                const isOwn = msg.player_id === playerId;
                const color = getPlayerColor(msg.player_id);
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-1.5 ${
                        isOwn
                          ? "bg-kahoot-gold/20 border border-kahoot-gold/30 animate-pop-in"
                          : "bg-white/10 border-r-2 animate-slide-up"
                      }`}
                      style={!isOwn ? { borderRightColor: color } : undefined}
                    >
                      {!isOwn && (
                        <p
                          className="text-xs font-medium mb-0.5 leading-tight"
                          style={{ color }}
                        >
                          {getPlayerName(msg.player_id)}
                        </p>
                      )}
                      <p className="text-sm text-white/90 leading-snug break-words">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} className="h-1" />
            </div>

            {/* Input */}
            <div className="flex gap-2 items-center px-3 py-2.5
                           border-t border-white/10 shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={"\u200F\u05DB\u05EA\u05D1\u05D5 \u05D4\u05D5\u05D3\u05E2\u05D4..."}
                maxLength={200}
                className="flex-1 min-w-0 rounded-xl px-3 py-2 text-sm
                          bg-white/10 border border-white/15 text-white
                          placeholder-white/30 outline-none
                          focus:border-kahoot-gold/50 transition-colors"
                dir="rtl"
                autoComplete="off"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="shrink-0 rounded-xl px-3 py-2 text-sm font-bold
                          bg-kahoot-blue text-white
                          hover:brightness-110 active:scale-95
                          disabled:opacity-30 disabled:cursor-not-allowed
                          transition-all duration-150"
              >
                {"\u200F\u05E9\u05DC\u05D7\u05D5"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
