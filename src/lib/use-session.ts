"use client";

import { useState, useEffect, useCallback } from "react";

interface Session {
  clientId: string;
  nickname: string | null;
}

export function useSession() {
  const [session, setSession] = useState<Session>({ clientId: "", nickname: null });

  useEffect(() => {
    let clientId = localStorage.getItem("middlegame_client_id");
    if (!clientId) {
      clientId = typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map((b, i) => ([4,6,8,10].includes(i) ? "-" : "") + b.toString(16).padStart(2, "0"))
            .join("");
      localStorage.setItem("middlegame_client_id", clientId);
    }
    const nickname = localStorage.getItem("middlegame_nickname");
    setSession({ clientId, nickname });
  }, []);

  const setNickname = useCallback((name: string) => {
    localStorage.setItem("middlegame_nickname", name);
    setSession((s) => ({ ...s, nickname: name }));
  }, []);

  return { ...session, setNickname };
}
