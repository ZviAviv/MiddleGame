"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Tracks which players are currently online (have the game open)
 * using Supabase Realtime Presence.
 */
export function usePresence(gameCode: string, playerId: string | null): Set<string> | null {
  // null = not yet synced (treat everyone as online); Set = synced presence data
  const [onlineIds, setOnlineIds] = useState<Set<string> | null>(null);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    if (!gameCode || !playerId) return;

    const supabase = supabaseRef.current;
    const channel = supabase.channel(`presence-${gameCode}`, {
      config: { presence: { key: playerId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const ids = new Set<string>(Object.keys(state));
        setOnlineIds(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ player_id: playerId });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameCode, playerId]);

  return onlineIds;
}
