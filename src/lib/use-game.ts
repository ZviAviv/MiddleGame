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
}

export function useGame(gameCode: string, playerId: string | null): UseGameReturn {
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const gameIdRef = useRef<string | null>(null);

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
            prev.map((r) => (r.id === (payload.new as Round).id ? (payload.new as Round) : r))
          );
        }
      )
      // New submissions — no game-scoped filter available (round_id is FK, not game_id),
      // so filter client-side by checking against known round IDs
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        (payload) => {
          const sub = payload.new as Submission;
          setRounds((currentRounds) => {
            // Only add submission if its round belongs to this game
            const belongsToGame = currentRounds.some((r) => r.id === sub.round_id);
            if (belongsToGame) {
              setSubmissions((prev) => {
                if (prev.some((s) => s.id === sub.id)) return prev;
                return [...prev, sub];
              });
            }
            return currentRounds; // don't modify rounds
          });
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // Re-fetch all data on reconnect to catch any missed events
          setTimeout(() => {
            fetchAllData(currentGameId);
          }, 1000);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id, fetchAllData]);

  // Poll every 2s as a reliable fallback (Realtime may not be delivering events)
  useEffect(() => {
    const id = gameIdRef.current;
    if (!id) return;
    // Stop polling once game is finished
    if (game?.status === "finished") return;

    const interval = setInterval(() => {
      // Only poll when tab is visible
      if (document.visibilityState === "visible") {
        fetchAllData(id);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [game?.id, game?.status, fetchAllData]);

  // Derive game state
  const currentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;

  // A round is "complete" when both words are revealed
  const isCurrentRoundComplete = !!(currentRound?.word1 && currentRound?.word2);

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

  const canSubmit =
    !!playerId &&
    game?.status !== "finished" &&
    !hasSubmittedThisRound;

  const currentPlayer = players.find((p) => p.id === playerId) || null;

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
  };
}
