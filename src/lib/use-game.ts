"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Game, Player, Round, Submission, GamePhase } from "@/types/game";

interface UseGameReturn {
  game: Game | null;
  players: Player[];
  rounds: Round[];
  submissions: Submission[];
  currentRound: Round | null;
  currentPlayer: Player | null;
  phase: GamePhase;
  canSubmit: boolean;
  hasSubmittedThisRound: boolean;
  loading: boolean;
  refresh: () => void;
}

export function useGame(gameCode: string, playerId: string | null): UseGameReturn {
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const gameIdRef = useRef<string | null>(null);
  const roundIdsRef = useRef<Set<string>>(new Set());

  // Full data fetch — used both on initial load and on reconnect
  const fetchAllData = useCallback(async (gameId: string) => {
    const supabase = supabaseRef.current;

    const [gameRes, playersRes, roundsRes] = await Promise.all([
      supabase.from("games").select("*").eq("id", gameId).single(),
      supabase.from("players").select("*").eq("game_id", gameId).order("joined_at"),
      supabase.from("rounds").select("*").eq("game_id", gameId).order("round_number"),
    ]);

    if (gameRes.data) setGame(gameRes.data as Game);
    setPlayers((playersRes.data || []) as Player[]);
    const roundsList = (roundsRes.data || []) as Round[];
    setRounds(roundsList);

    if (roundsList.length > 0) {
      const roundIds = roundsList.map((r) => r.id);
      const { data: subsData } = await supabase
        .from("submissions")
        .select("*")
        .in("round_id", roundIds)
        .order("submitted_at");
      setSubmissions((subsData || []) as Submission[]);
    } else {
      setSubmissions([]);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    const supabase = supabaseRef.current;

    async function fetchInitialData() {
      setLoading(true);

      // Fetch game by code
      const { data: gameData } = await supabase
        .from("games")
        .select("*")
        .eq("code", gameCode)
        .single();

      if (!gameData) {
        setLoading(false);
        return;
      }

      gameIdRef.current = gameData.id;
      setGame(gameData as Game);

      // Fetch related data in parallel
      const [playersRes, roundsRes] = await Promise.all([
        supabase.from("players").select("*").eq("game_id", gameData.id).order("joined_at"),
        supabase.from("rounds").select("*").eq("game_id", gameData.id).order("round_number"),
      ]);

      setPlayers((playersRes.data || []) as Player[]);
      const roundsList = (roundsRes.data || []) as Round[];
      setRounds(roundsList);

      // Fetch submissions for all rounds
      if (roundsList.length > 0) {
        const roundIds = roundsList.map((r) => r.id);
        const { data: subsData } = await supabase
          .from("submissions")
          .select("*")
          .in("round_id", roundIds)
          .order("submitted_at");
        setSubmissions((subsData || []) as Submission[]);
      }

      setLoading(false);
    }

    fetchInitialData();
  }, [gameCode]);

  // Keep roundIdsRef in sync with rounds state for submission filtering
  useEffect(() => {
    roundIdsRef.current = new Set(rounds.map((r) => r.id));
  }, [rounds]);

  // Realtime subscriptions
  useEffect(() => {
    if (!game) return;
    const supabase = supabaseRef.current;
    const currentGameId = game.id;

    const channel = supabase
      .channel(`game-${currentGameId}`)
      // Game updates (status changes)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${currentGameId}` },
        (payload) => {
          setGame(payload.new as Game);
        }
      )
      // New players joining
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "players", filter: `game_id=eq.${currentGameId}` },
        (payload) => {
          setPlayers((prev) => {
            const newPlayer = payload.new as Player;
            if (prev.some((p) => p.id === newPlayer.id)) return prev;
            return [...prev, newPlayer];
          });
        }
      )
      // Round changes (new rounds or round updates with words)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rounds", filter: `game_id=eq.${currentGameId}` },
        (payload) => {
          setRounds((prev) => {
            const newRound = payload.new as Round;
            if (prev.some((r) => r.id === newRound.id)) return prev;
            return [...prev, newRound];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rounds", filter: `game_id=eq.${currentGameId}` },
        (payload) => {
          setRounds((prev) =>
            prev.map((r) => {
              if (r.id !== (payload.new as Round).id) return r;
              const incoming = payload.new as Round;
              // Don't let a stale event erase words already known to the client
              const curWords = (r.word1 !== null ? 1 : 0) + (r.word2 !== null ? 1 : 0);
              const newWords = (incoming.word1 !== null ? 1 : 0) + (incoming.word2 !== null ? 1 : 0);
              return newWords >= curWords ? incoming : r;
            })
          );
        }
      )
      // New submissions — no game-scoped filter available (round_id is FK, not game_id),
      // so filter client-side using roundIdsRef (avoids unsafe nested setState)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        (payload) => {
          const sub = payload.new as Submission;
          if (roundIdsRef.current.has(sub.round_id)) {
            setSubmissions((prev) => {
              if (prev.some((s) => s.id === sub.id)) return prev;
              return [...prev, sub];
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // Re-fetch all data to catch any missed events
          fetchAllData(currentGameId);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id, fetchAllData]);

  // Poll every 2s as a reliable fallback (Realtime may not be delivering events)
  // Keep polling when finished (but slower) to pick up next_game_code for rematch
  useEffect(() => {
    const id = game?.id;
    if (!id) return;
    // Stop polling once rematch is ready (next_game_code set)
    if (game?.next_game_code) return;

    const delay = game?.status === "finished" ? 3000 : 2000;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchAllData(id);
      }
    }, delay);

    return () => clearInterval(interval);
  }, [game?.id, game?.status, game?.next_game_code, fetchAllData]);

  // Derive game state
  const currentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;

  // A round is "complete" when all players have submitted
  const isCurrentRoundComplete = !!currentRound?.is_complete;

  // If the current round is complete, players can submit again (goes to next round)
  const hasSubmittedThisRound = !!(
    currentRound &&
    !isCurrentRoundComplete &&
    playerId &&
    submissions.some((s) => s.round_id === currentRound.id && s.player_id === playerId)
  );

  const roundSubmissionCount = currentRound && !isCurrentRoundComplete
    ? submissions.filter((s) => s.round_id === currentRound.id).length
    : 0;

  const phase: GamePhase =
    game?.status === "finished"
      ? "finished"
      : game?.status === "lobby"
        ? "lobby"
        : "waiting_for_submissions";

  // Block submissions while the latest round just completed but hasn't been
  // "revealed" yet (similarity not computed). This prevents a late submitter's
  // word from accidentally landing in the next round before they see results.
  // Once similarity_level arrives (or for generated/first rounds), unblock.
  const isWaitingForReveal =
    isCurrentRoundComplete &&
    currentRound != null &&
    currentRound.similarity_level == null &&
    !currentRound.is_match;

  const canSubmit =
    !!playerId &&
    game?.status !== "finished" &&
    !hasSubmittedThisRound &&
    !isWaitingForReveal;

  const currentPlayer = players.find((p) => p.id === playerId) || null;

  const refresh = useCallback(() => {
    const id = gameIdRef.current || game?.id;
    if (id) fetchAllData(id);
  }, [fetchAllData, game?.id]);

  return {
    game,
    players,
    rounds,
    submissions,
    currentRound,
    currentPlayer,
    phase,
    canSubmit,
    hasSubmittedThisRound,
    loading,
    refresh,
  };
}
