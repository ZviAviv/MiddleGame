# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MiddleGame (משחק האמצע) is a Hebrew-language real-time multiplayer word game built with Next.js and Supabase. Two or more players submit words each round; if two players submit the same or nearly identical word (fuzzy match via Levenshtein distance ≤ 1), the game ends in a match. The UI follows a Kahoot-inspired visual style with RTL layout.

## Commands

- `npm run dev` — start local dev server
- `npm run build` — production build
- `npm run start` — run production server after build
- `npm run lint` — lint with Next.js ESLint config

## Architecture

**Stack:** Next.js 16 (App Router), React 19, Supabase (Postgres + Realtime), Tailwind CSS 4, TypeScript

**Key patterns:**
- **Server Actions** (`src/lib/game-actions.ts`): `createGame`, `joinGame`, `submitWord`, `resetGame` — all game mutations go through Next.js `"use server"` functions that call Supabase server-side
- **Race-safe word submission**: The `submit_word` Postgres RPC (`supabase/rpc.sql`) uses `FOR UPDATE` row locking to serialize submissions per game. All game state transitions (lobby→active, creating rounds, detecting matches, active→finished) happen entirely inside this single atomic RPC — never in application code.
- **Realtime sync** (`src/lib/use-game.ts`): The `useGame` hook subscribes to Supabase Realtime postgres_changes on games, players, rounds, and submissions tables — all UI updates are push-based
- **Anonymous auth**: No Supabase auth — players identified by `client_id` (random UUID stored in localStorage). Player reconnection handled via upsert on `(game_id, client_id)`
- **Session persistence** (`src/lib/use-session.ts`): `clientId` and `nickname` stored in localStorage with `middlegame_` prefix. Player ID per game stored as `middlegame_player_${code}`.
- **Supabase clients**: Two separate clients — `src/lib/supabase/client.ts` (browser, `createBrowserClient`) and `src/lib/supabase/server.ts` (SSR, `createServerClient`). Server Actions import from `server.ts`; hooks and components import from `client.ts`.

**Data flow:** Landing page (`/`) → create or join game → `/game/[code]` page. Game page handles lobby, active play, and finished states via `GamePhase` type.

**Round lifecycle (handled in RPC):**
1. First submission ever → creates round 1, transitions game `lobby→active`
2. Each round holds exactly 2 submissions (position 1 and 2)
3. When a round already has 2 submissions, the next call creates a new round
4. If position-2 word matches position-1 word → `is_match = true`, game transitions to `finished`
5. Match detection uses **fuzzy matching**: exact match OR Levenshtein distance ≤ 1 (for words with 3+ characters). Requires the `fuzzystrmatch` PostgreSQL extension.

**Game reset flow:** When a match ends the game, players can play again with the same team. `resetGame` deletes all rounds/submissions for the game and resets status to `lobby`, keeping the same game code and players.

**Word storage:** Each submission stores both `word` (normalized, used for matching) and `word_raw` (original typed text, used for display). Normalization strips Hebrew niqqud (U+0591–U+05C7), collapses whitespace, and lowercases.

**GamePhase vs game.status:** `game.status` is `"lobby" | "active" | "finished"`. `GamePhase` (`src/types/game.ts`) maps `active` to `"waiting_for_submissions"` — these are not identical. `GamePhase` is client-only for UI routing; `game.status` is what the database stores.

**In-game chat** (`src/lib/use-chat.ts`, `src/components/Chat.tsx`): Real-time chat per game room via `chat_messages` table. Uses Supabase Realtime subscription with unread count tracking. Chat panel toggles open/closed; unread badge shown when closed.

**Rematch navigation**: Games have a `next_game_code` field. When players start a rematch, the old game links to the new game code so other players auto-navigate to it.

**Sound effects** (`src/lib/sounds.ts`): Synthesized via Web Audio API (no audio files). Four sounds: `pop` (round revealed), `whoosh`, `join` (player joined), `party` (match!). Mute state persisted in localStorage as `middlegame_muted`. AudioContext is resumed on demand to satisfy iOS autoplay restrictions.

## Components

- `Lobby` — waiting room, shows players list, game PIN
- `GameBoard` — scrollable history of all rounds with `WordPairRow` entries
- `WordPairRow` — one round row: round badge, two `WordCard`s, connector dots (pulsing when incomplete)
- `WordCard` — single word display; three states: submitted-but-hidden (🤐 with player color), awaiting (shimmer "?"), revealed (colored box, gold glow ring on match)
- `InputArea` — word submission form; doubles as game-start trigger in lobby phase; auto-refocuses when a new round begins
- `PlayerList` — compact player strip shown during active play with submission status indicators
- `PartyOverlay` — full-screen celebration shown on match; uses `canvas-confetti` for 5-burst sequence, scattered word cards, and a timing sequence (overlay → party mode at 1.5s → "new game?" button at 3.5s)
- `GamePin` / `ShareButton` — display and share the 4-digit game code
- `SoundToggle` — 🔊/🔇 icon button that toggles `soundManager.muted`
- `HowToPlay` — full-screen modal overlay with 4-step game instructions in Hebrew; accessible from home page ("?איך משחקים" button) and in-game (? icon button next to SoundToggle)

- `Chat` — slide-up in-game chat panel; shows unread badge on the toggle button; messages capped at 200 chars; backed by `useChat` hook (`src/lib/use-chat.ts`)

## Database

Schema in `supabase/schema.sql`, RPC in `supabase/rpc.sql`. Five tables: `games`, `players`, `rounds`, `submissions`, `chat_messages`. All tables have permissive RLS (no auth, including DELETE policies for rounds/submissions to support game reset) and are added to Supabase Realtime publication. The `fuzzystrmatch` extension must be enabled for fuzzy word matching.

**Important:** SQL changes in `schema.sql` and `rpc.sql` are tracked in Git but must be manually applied via the Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run). There is no automated migration system.

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Conventions

- All user-facing text is in Hebrew with RTL direction (`dir="rtl"`). Hebrew strings in JSX use Unicode escape sequences (e.g. `"\u200F"` for RLM marks) rather than raw Hebrew characters.
- Path alias: `@/*` maps to `./src/*`
- Player colors are assigned by join order from a fixed 8-color palette (`PLAYER_COLORS` in `src/lib/utils.ts`). The `buildPlayerColorMap` helper returns a `Map<playerId, color>` passed as a prop through the component tree.
- Tailwind uses custom Kahoot-palette class names: `kahoot-blue`, `kahoot-green`, `kahoot-gold`, `kahoot-red`, `kahoot-pink`, `kahoot-yellow`. Button styles use the custom `btn-3d` class. The full theme (colors + animations) is defined via a `@theme` block in `src/app/globals.css` — there is no `tailwind.config.js`.
- Custom animations in `globals.css`: `bounce-in`, `slide-up`, `shake`, `glow-pulse`, `float`, `pop-in`, `shimmer`, `gradient-shift`, `fade-scale-in`. All respect `prefers-reduced-motion`.
- Font: Rubik (Google Fonts, Hebrew subsets, weights 400–900), loaded in `src/app/layout.tsx`.
- Generated images: Favicon, Apple icon, and OpenGraph image are generated at build time via Next.js `ImageResponse` in `src/app/` — no static image files.
- No test framework is configured. There are no automated tests.
