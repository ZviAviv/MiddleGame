-- ============================================
-- Race-safe word submission RPC
-- Apply this in the Supabase SQL Editor AFTER schema.sql
-- ============================================

CREATE OR REPLACE FUNCTION submit_word(
  p_game_id UUID,
  p_player_id UUID,
  p_word TEXT,
  p_word_raw TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game_status TEXT;
  v_current_round rounds%ROWTYPE;
  v_submission_count INT;
  v_position INT;
  v_is_match BOOLEAN := false;
  v_round_id UUID;
  v_other_word TEXT;
BEGIN
  -- Lock the game row to serialize all submissions for this game
  SELECT status INTO v_game_status
  FROM games WHERE id = p_game_id FOR UPDATE;

  IF v_game_status IS NULL THEN
    RETURN jsonb_build_object('error', 'game_not_found');
  END IF;

  IF v_game_status = 'finished' THEN
    RETURN jsonb_build_object('error', 'game_finished');
  END IF;

  -- Get the latest round for this game (with lock)
  SELECT * INTO v_current_round
  FROM rounds
  WHERE game_id = p_game_id
  ORDER BY round_number DESC
  LIMIT 1
  FOR UPDATE;

  -- If no rounds exist, create round 1
  IF v_current_round IS NULL THEN
    INSERT INTO rounds (game_id, round_number)
    VALUES (p_game_id, 1)
    RETURNING * INTO v_current_round;

    -- Transition game from lobby to active
    UPDATE games SET status = 'active' WHERE id = p_game_id AND status = 'lobby';
  END IF;

  v_round_id := v_current_round.id;

  -- Count existing submissions for the current round
  SELECT COUNT(*) INTO v_submission_count
  FROM submissions WHERE round_id = v_round_id;

  -- If round already has 2 submissions, create a new round
  IF v_submission_count >= 2 THEN
    INSERT INTO rounds (game_id, round_number)
    VALUES (p_game_id, v_current_round.round_number + 1)
    RETURNING * INTO v_current_round;

    v_round_id := v_current_round.id;
    v_submission_count := 0;
  END IF;

  -- Prevent duplicate submission by same player in same round
  IF EXISTS (
    SELECT 1 FROM submissions
    WHERE round_id = v_round_id AND player_id = p_player_id
  ) THEN
    RETURN jsonb_build_object('error', 'already_submitted');
  END IF;

  v_position := v_submission_count + 1;

  -- Insert the submission
  INSERT INTO submissions (round_id, player_id, word, word_raw, position)
  VALUES (v_round_id, p_player_id, p_word, p_word_raw, v_position);

  -- Update the round based on position
  IF v_position = 1 THEN
    UPDATE rounds
    SET word1 = p_word,
        word1_raw = p_word_raw,
        player1_id = p_player_id
    WHERE id = v_round_id;
  ELSIF v_position = 2 THEN
    -- Get the first word to check for match
    SELECT word INTO v_other_word
    FROM submissions
    WHERE round_id = v_round_id AND position = 1;

    -- Fuzzy match: exact match OR Levenshtein distance <= 1 for words with 3+ chars
    IF v_other_word = p_word THEN
      v_is_match := true;
    ELSIF length(v_other_word) >= 3 AND length(p_word) >= 3
          AND levenshtein(v_other_word, p_word) <= 1 THEN
      v_is_match := true;
    ELSE
      v_is_match := false;
    END IF;

    UPDATE rounds
    SET word2 = p_word,
        word2_raw = p_word_raw,
        player2_id = p_player_id,
        is_match = v_is_match
    WHERE id = v_round_id;

    -- If words match, game is finished!
    IF v_is_match THEN
      UPDATE games SET status = 'finished' WHERE id = p_game_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'position', v_position,
    'round_number', v_current_round.round_number,
    'round_id', v_round_id,
    'is_match', v_is_match
  );
END;
$$;
