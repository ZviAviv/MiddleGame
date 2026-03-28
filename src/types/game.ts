export interface Game {
  id: string;
  code: string;
  status: "lobby" | "active" | "finished";
  next_game_code: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  game_id: string;
  nickname: string;
  client_id: string;
  joined_at: string;
}

export interface Round {
  id: string;
  game_id: string;
  round_number: number;
  word1: string | null;
  word1_raw: string | null;
  word2: string | null;
  word2_raw: string | null;
  player1_id: string | null;
  player2_id: string | null;
  is_match: boolean;
  is_complete: boolean;
  created_at: string;
}

export interface Submission {
  id: string;
  round_id: string;
  player_id: string;
  word: string;
  word_raw: string;
  position: number | null;
  submitted_at: string;
}

export interface SubmitResult {
  success?: boolean;
  error?: string;
  position?: number;
  round_number?: number;
  round_id?: string;
  is_match?: boolean;
}

export interface ChatMessage {
  id: string;
  game_id: string;
  player_id: string;
  message: string;
  sent_at: string;
}

export type GamePhase = "lobby" | "waiting_for_submissions" | "finished";
