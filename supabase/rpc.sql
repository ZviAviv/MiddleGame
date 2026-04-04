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
  v_player_count INT;
  v_position INT;
  v_is_match BOOLEAN := false;
  v_round_id UUID;
  v_match_word TEXT;
  v_match_word_raw TEXT;
  v_match_player1_id UUID;
  v_match_player2_id UUID;
  v_sub1 RECORD;
  v_sub2 RECORD;
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

  -- Verify this player belongs to the game
  IF NOT EXISTS (
    SELECT 1 FROM players WHERE game_id = p_game_id AND id = p_player_id
  ) THEN
    RETURN jsonb_build_object('error', 'player_not_in_game');
  END IF;

  -- Always exactly 2 submissions per round (word pair game).
  -- Extra players wait for the next round.
  v_player_count := 2;

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

  -- If round is complete (all players submitted), start a new round
  IF v_submission_count >= v_player_count AND v_player_count > 0 THEN
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

  -- Re-count submissions after insertion
  v_submission_count := v_submission_count + 1;

  -- If all players have now submitted, check for matches among all pairs
  IF v_submission_count >= v_player_count AND v_player_count > 0 THEN
    -- Check all pairs of submissions for a match
    FOR v_sub1 IN
      SELECT * FROM submissions WHERE round_id = v_round_id ORDER BY position
    LOOP
      FOR v_sub2 IN
        SELECT * FROM submissions WHERE round_id = v_round_id AND position > v_sub1.position ORDER BY position
      LOOP
        -- Exact match only — spelling variant detection is handled
        -- in the application layer via Gemini API after round completes.
        IF v_sub1.word = v_sub2.word THEN
          v_is_match := true;
        END IF;

        IF v_is_match THEN
          v_match_word := v_sub1.word;
          v_match_word_raw := v_sub1.word_raw;
          v_match_player1_id := v_sub1.player_id;
          v_match_player2_id := v_sub2.player_id;
          EXIT; -- break inner loop
        END IF;
      END LOOP;

      IF v_is_match THEN
        EXIT; -- break outer loop
      END IF;
    END LOOP;

    -- Update round: mark complete, and set match data if found
    UPDATE rounds
    SET is_complete = true,
        is_match = v_is_match,
        word1 = CASE WHEN v_is_match THEN v_match_word ELSE NULL END,
        word1_raw = CASE WHEN v_is_match THEN v_match_word_raw ELSE NULL END,
        player1_id = CASE WHEN v_is_match THEN v_match_player1_id ELSE NULL END,
        word2 = CASE WHEN v_is_match THEN v_match_word ELSE NULL END,
        word2_raw = CASE WHEN v_is_match THEN (SELECT word_raw FROM submissions WHERE round_id = v_round_id AND player_id = v_match_player2_id) ELSE NULL END,
        player2_id = CASE WHEN v_is_match THEN v_match_player2_id ELSE NULL END
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
