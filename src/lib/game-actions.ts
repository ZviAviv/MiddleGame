"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeWord, generateGameCode } from "@/lib/utils";
import type { SubmitResult } from "@/types/game";

export async function createGame(): Promise<{ code: string } | { error: string }> {
  const supabase = await createClient();

  // Try up to 5 times to get a unique 4-digit code
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateGameCode();
    const { data, error } = await supabase
      .from("games")
      .insert({ code })
      .select()
      .single();

    if (error?.code === "23505") continue; // unique violation, retry
    if (error) return { error: error.message };
    return { code: data.code.trim() };
  }

  return { error: "Could not generate unique game code" };
}

export async function joinGame(
  code: string,
  nickname: string,
  clientId: string
): Promise<{ gameId: string; playerId: string } | { error: string }> {
  const supabase = await createClient();

  // Find the game by code
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select()
    .eq("code", code.trim())
    .single();

  if (gameError || !game) return { error: "game_not_found" };
  if (game.status === "finished") return { error: "game_finished" };

  // Upsert player (handles reconnection via same client_id)
  const { data: player, error: playerError } = await supabase
    .from("players")
    .upsert(
      { game_id: game.id, nickname: nickname.trim(), client_id: clientId },
      { onConflict: "game_id,client_id" }
    )
    .select()
    .single();

  if (playerError || !player) return { error: playerError?.message || "join_failed" };

  return { gameId: game.id, playerId: player.id };
}

export async function resetGame(
  gameCode: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  // Find the game
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id")
    .eq("code", gameCode.trim())
    .single();

  if (gameError || !game) return { error: "game_not_found" };

  // Get all round IDs for this game
  const { data: rounds } = await supabase
    .from("rounds")
    .select("id")
    .eq("game_id", game.id);

  // Delete submissions for those rounds
  if (rounds && rounds.length > 0) {
    const roundIds = rounds.map((r) => r.id);
    await supabase.from("submissions").delete().in("round_id", roundIds);
  }

  // Delete all rounds
  await supabase.from("rounds").delete().eq("game_id", game.id);

  // Reset game status back to lobby
  const { error: updateError } = await supabase
    .from("games")
    .update({ status: "lobby", next_game_code: null })
    .eq("id", game.id);

  if (updateError) return { error: updateError.message };

  return { success: true };
}

export async function submitWord(
  gameId: string,
  playerId: string,
  wordRaw: string
): Promise<SubmitResult> {
  const supabase = await createClient();
  const word = normalizeWord(wordRaw);

  if (!word) return { error: "empty_word" };

  const { data, error } = await supabase.rpc("submit_word", {
    p_game_id: gameId,
    p_player_id: playerId,
    p_word: word,
    p_word_raw: wordRaw.trim(),
  });

  if (error) return { error: error.message };
  return data as SubmitResult;
}
