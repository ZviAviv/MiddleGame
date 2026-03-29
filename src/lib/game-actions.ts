"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeWord, generateGameCode } from "@/lib/utils";
import { computeSimilarityLevel, checkSpellingMatch, generateRandomWordPair } from "@/lib/similarity";
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

  const result = data as SubmitResult;

  // After a successful submission, if the round is now complete,
  // compute semantic similarity in the background (non-blocking for the player).
  // The result is written to the rounds table and arrives via Realtime.
  if (result.success && result.round_id) {
    // Await similarity computation — adds ~200ms but runs while player
    // is still in "waiting" state so it doesn't feel slow.
    // Must await because Next.js Server Actions kill fire-and-forget promises.
    try {
      await computeSimilarityForRound(supabase, result.round_id);
    } catch (err) {
      console.error("Similarity computation failed:", err);
    }
  }

  return result;
}

/**
 * Generates two random starting words and inserts them as a complete round.
 * Bypasses the RPC to allow single-player generation (no second player needed yet).
 * The generated round acts as a "seed" — other players can join afterwards.
 */
export async function generateStartingWords(
  gameId: string,
  creatorPlayerId: string
): Promise<{ success: true } | { error: string }> {
  const pair = generateRandomWordPair();
  const supabase = await createClient();

  // Create round 1
  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .insert({ game_id: gameId, round_number: 1, is_complete: true })
    .select()
    .single();

  if (roundError || !round) return { error: roundError?.message || "round_create_failed" };

  // Insert both submissions (both attributed to the creator for generated rounds)
  const { error: subError } = await supabase
    .from("submissions")
    .insert([
      {
        round_id: round.id,
        player_id: creatorPlayerId,
        word: normalizeWord(pair.word1),
        word_raw: pair.word1,
        position: 1,
      },
      {
        round_id: round.id,
        player_id: creatorPlayerId,
        word: normalizeWord(pair.word2),
        word_raw: pair.word2,
        position: 2,
      },
    ]);

  if (subError) return { error: subError.message };

  // Transition game to active
  await supabase
    .from("games")
    .update({ status: "active" })
    .eq("id", gameId);

  // Compute similarity for the generated round
  try {
    await computeSimilarityForRound(supabase, round.id);
  } catch (err) {
    console.error("Similarity computation for generated round failed:", err);
  }

  return { success: true };
}

async function computeSimilarityForRound(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roundId: string
) {
  // Check if the round is complete
  const { data: round } = await supabase
    .from("rounds")
    .select("is_complete, is_match, similarity_level, game_id")
    .eq("id", roundId)
    .single();

  if (!round?.is_complete) return;

  // Get all submissions for this round
  const { data: subs } = await supabase
    .from("submissions")
    .select("word, word_raw, player_id")
    .eq("round_id", roundId)
    .order("position");

  if (!subs || subs.length < 2) return;

  // If not already a match, check for spelling variants (כתיב מלא/חסר etc.)
  // The RPC only does exact match — this handles smart fuzzy matching via Gemini.
  if (!round.is_match) {
    const isSpellingMatch = await checkSpellingMatch(subs[0].word, subs[1].word);

    if (isSpellingMatch) {
      // Upgrade to match: update round and finish game
      await supabase
        .from("rounds")
        .update({
          is_match: true,
          word1: subs[0].word,
          word1_raw: subs[0].word_raw,
          player1_id: subs[0].player_id,
          word2: subs[1].word,
          word2_raw: subs[1].word_raw,
          player2_id: subs[1].player_id,
          similarity_level: 1, // spelling variants are essentially the same word
        })
        .eq("id", roundId);

      await supabase
        .from("games")
        .update({ status: "finished" })
        .eq("id", round.game_id);

      console.log(`Spelling match detected: "${subs[0].word}" ≈ "${subs[1].word}" — game finished!`);
      return; // no need to compute similarity
    }
  }

  // Compute semantic similarity for visual distance
  if (round.similarity_level == null) {
    const level = await computeSimilarityLevel(subs[0].word, subs[1].word);
    if (level != null) {
      await supabase
        .from("rounds")
        .update({ similarity_level: level })
        .eq("id", roundId);
    }
  }
}
