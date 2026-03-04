"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/types/game";

interface UseChatReturn {
  messages: ChatMessage[];
  unreadCount: number;
  sendMessage: (text: string) => Promise<void>;
  markRead: () => void;
}

export function useChat(
  gameId: string | null,
  playerId: string | null,
  isOpen: boolean
): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabaseRef = useRef(createClient());
  const isOpenRef = useRef(isOpen);

  // Keep isOpenRef in sync
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Initial fetch + Realtime subscription
  useEffect(() => {
    if (!gameId) return;
    const supabase = supabaseRef.current;

    // Fetch existing messages
    supabase
      .from("chat_messages")
      .select("*")
      .eq("game_id", gameId)
      .order("sent_at")
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[]);
      });

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // Increment unread if panel is closed and message is from someone else
          if (!isOpenRef.current && msg.player_id !== playerId) {
            setUnreadCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, playerId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!gameId || !playerId || !text.trim()) return;
      const supabase = supabaseRef.current;
      await supabase.from("chat_messages").insert({
        game_id: gameId,
        player_id: playerId,
        message: text.trim().slice(0, 200),
      });
    },
    [gameId, playerId]
  );

  const markRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return { messages, unreadCount, sendMessage, markRead };
}
