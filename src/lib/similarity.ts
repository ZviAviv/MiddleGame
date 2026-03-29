/**
 * Semantic similarity computation using Google text-embedding-004.
 * Server-side only — called from game-actions.ts (which has "use server").
 * Embeds two words → cosine similarity → maps to discrete level 1-7.
 *
 * Level 1 = synonyms (closest), Level 7 = completely unrelated (farthest).
 * Non-blocking: called after round completion, result arrives via Realtime.
 *
 * Uses gemini-embedding-2-preview with taskType: SEMANTIC_SIMILARITY.
 * Words are prefixed with Hebrew context hint for improved multilingual embeddings.
 *
 * Calibrated score ranges (with context prefix):
 *   synonyms:       0.88–0.95  (כעוס/זועם, קר/צונן)
 *   very related:   0.84–0.90  (עיר/כפר, בית/דירה)
 *   related:        0.80–0.88  (שלג/חורף, שף/סכין)
 *   somewhat:       0.78–0.81  (מנטה/שוקולד)
 *   unrelated:      0.71–0.76  (גרביים/צדק, מקלדת/יער)
 */

const EMBEDDING_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent";

interface EmbeddingResponse {
  embedding: {
    values: number[];
  };
}

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY environment variable is not set");
  }

  const response = await fetch(`${EMBEDDING_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/gemini-embedding-2-preview",
      content: { parts: [{ text: `המילה בעברית: ${text}` }] },
      taskType: "SEMANTIC_SIMILARITY",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as EmbeddingResponse;
  return data.embedding.values;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Maps a cosine similarity score (0.0–1.0) to a discrete level (1–7).
 * Level 1 = most similar (synonyms), Level 7 = least similar (unrelated).
 *
 * Calibrated for Hebrew word pairs via gemini-embedding-2-preview with
 * taskType: SEMANTIC_SIMILARITY and "המילה בעברית:" context prefix.
 *
 * Measured scores:
 *   כעוס/זועם   = 0.949 → 1   קר/צונן      = 0.885 → 1
 *   שלג/חורף    = 0.877 → 2   דבש/דבורה    = 0.882 → 2
 *   עיר/כפר     = 0.843 → 3   בית/דירה     = 0.843 → 3
 *   עיר/ישוב    = 0.856 → 3   שף/סכין      = 0.798 → 4
 *   גבינה/שוקולד = 0.809 → 4   מנטה/שוקולד  = 0.787 → 5
 *   מכות/יופי   = 0.757 → 6   מקלדת/יער    = 0.752 → 6
 *   גרביים/צדק  = 0.716 → 7
 */
function similarityToLevel(score: number): number {
  if (score >= 0.88) return 1; // synonyms: כעוס/זועם, קר/צונן
  if (score >= 0.86) return 2; // near-synonyms: שלג/חורף, דבש/דבורה
  if (score >= 0.83) return 3; // very related: עיר/כפר, בית/דירה
  if (score >= 0.80) return 4; // related: שף/סכין, גבינה/שוקולד
  if (score >= 0.77) return 5; // somewhat related: מנטה/שוקולד
  if (score >= 0.74) return 6; // weakly related: מכות/יופי, מקלדת/יער
  return 7;                     // unrelated: גרביים/צדק
}

/**
 * Levenshtein distance between two strings (for pre-filtering).
 */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return dp[m][n];
}

/**
 * Uses embeddings to determine if two Hebrew words are the same word
 * written with different spelling (כתיב מלא vs כתיב חסר, ה/א variants, etc.).
 *
 * Same-word spelling variants have extremely high embedding similarity (> 0.95),
 * while different words that are merely close in spelling score much lower.
 * E.g. שמחה/שימחה → ~0.99 (same word), ניצוץ/פיצוץ → ~0.85 (different words).
 */
async function areWordsSameSpelling(word1: string, word2: string): Promise<boolean> {
  try {
    const [emb1, emb2] = await Promise.all([
      getEmbedding(word1),
      getEmbedding(word2),
    ]);
    const similarity = cosineSimilarity(emb1, emb2);
    const isSame = similarity >= 0.96;
    console.log(`Spelling check: "${word1}" vs "${word2}" → similarity=${similarity.toFixed(4)}, ${isSame ? "SAME WORD" : "DIFFERENT WORDS"}`);
    return isSame;
  } catch (error) {
    console.error("Spelling check failed:", error);
    return false;
  }
}

/**
 * Checks if two non-identical words are actually the same word with different spelling.
 * Pre-filters with Levenshtein distance ≤ 2, then uses Gemini for smart verification.
 * Returns true if the words should be considered a match.
 */
export async function checkSpellingMatch(word1: string, word2: string): Promise<boolean> {
  if (word1 === word2) return true;
  if (word1.length < 2 || word2.length < 2) return false;

  const dist = levenshtein(word1, word2);
  if (dist > 2) return false;

  return areWordsSameSpelling(word1, word2);
}

/**
 * Pre-built word pairs at far semantic distance (level 5-7 range).
 * These have no obvious connection — players need to find the middle ground.
 * Curated for interesting gameplay in Hebrew.
 */
const RANDOM_WORD_PAIRS: [string, string][] = [
  ["\u05D3\u05E8\u05E7\u05D5\u05DF", "\u05D3\u05E3"],       // דרקון / דף
  ["\u05E1\u05DB\u05D9\u05DF", "\u05D9\u05E2\u05E8"],       // סכין / יער
  ["\u05E9\u05DE\u05D9\u05D9\u05DD", "\u05D7\u05D2\u05D9\u05D2\u05D4"], // שמיים / חגיגה
  ["\u05DE\u05D8\u05E8\u05D9\u05D4", "\u05E4\u05E1\u05E0\u05D5"], // מטריה / פסנו
  ["\u05D0\u05E8\u05E0\u05D1", "\u05DE\u05D3\u05D1\u05E8"],   // ארנב / מדבר
  ["\u05DB\u05D5\u05DB\u05D1", "\u05DE\u05D6\u05DC\u05D2"],   // כוכב / מזלג
  ["\u05E9\u05E2\u05D5\u05DF", "\u05EA\u05D5\u05EA"],       // שעון / תות
  ["\u05DE\u05E4\u05EA\u05D7", "\u05E2\u05E0\u05DF"],       // מפתח / ענן
  ["\u05D2\u05DC\u05D9\u05D3\u05D4", "\u05DE\u05D3\u05E2"],   // גלידה / מדע
  ["\u05E0\u05E8", "\u05D0\u05D5\u05E4\u05E0\u05D9\u05D9\u05DD"], // נר / אופניים
  ["\u05D3\u05D1\u05E9", "\u05DE\u05D7\u05E9\u05D1"],       // דבש / מחשב
  ["\u05E6\u05D1", "\u05D7\u05DC\u05DC"],                   // צב / חלל
  ["\u05E7\u05E4\u05D4", "\u05DE\u05D3\u05D1\u05E8"],       // קפה / מדבר
  ["\u05D7\u05D5\u05DC\u05E6\u05D4", "\u05D9\u05E8\u05D7"],   // חולצה / ירח
  ["\u05E4\u05D9\u05DC", "\u05DE\u05E0\u05D5\u05E8\u05D4"],   // פיל / מנורה
  ["\u05D0\u05E9", "\u05DE\u05D6\u05D5\u05D5\u05D3\u05D4"],   // אש / מזוודה
  ["\u05D3\u05D2", "\u05D4\u05E8"],                         // דג / הר
  ["\u05DE\u05D5\u05E1\u05D9\u05E7\u05D4", "\u05E6\u05D1\u05E2"], // מוסיקה / צבע
  ["\u05E8\u05DB\u05D1\u05EA", "\u05E2\u05D5\u05D2\u05D4"],   // רכבת / עוגה
  ["\u05E1\u05E4\u05E8", "\u05D7\u05D5\u05DC"],             // ספר / חול
  ["\u05DB\u05E4\u05EA\u05D5\u05E8", "\u05E9\u05DE\u05E9"],   // כפתור / שמש
  ["\u05DE\u05D8\u05D1\u05E2", "\u05D7\u05DC\u05D5\u05DD"],   // מטבע / חלום
  ["\u05D2\u05E9\u05E8", "\u05E9\u05DC\u05D2"],             // גשר / שלג
  ["\u05DE\u05E8\u05D0\u05D4", "\u05DB\u05D3\u05D5\u05E8"],   // מראה / כדור
  ["\u05E7\u05D5\u05E3", "\u05DE\u05D8\u05D1\u05D7"],       // קוף / מטבח
  ["\u05E2\u05D9\u05E4\u05E8\u05D5\u05DF", "\u05D9\u05DD"],   // עיפרון / ים
  ["\u05DE\u05E9\u05E7\u05E4\u05D9\u05D9\u05DD", "\u05D2\u05DF"], // משקפיים / גן
  ["\u05DB\u05D5\u05D1\u05E2", "\u05D3\u05D9\u05D5"],       // כובע / דיו
  ["\u05E9\u05DE\u05D9\u05DB\u05D4", "\u05E6\u05D9\u05E4\u05D5\u05E8"], // שמיכה / ציפור
  ["\u05DE\u05D2\u05D3\u05DC", "\u05E1\u05D5\u05D3"],       // מגדל / סוד
];

/**
 * Returns a random word pair from the curated list.
 * Pairs are at medium semantic distance (level 4-5), interesting for gameplay.
 */
export function generateRandomWordPair(): { word1: string; word2: string } {
  const idx = Math.floor(Math.random() * RANDOM_WORD_PAIRS.length);
  const [word1, word2] = RANDOM_WORD_PAIRS[idx];
  // Randomly swap order so it's not always the same direction
  if (Math.random() > 0.5) {
    return { word1: word2, word2: word1 };
  }
  return { word1, word2 };
}

/**
 * Computes the semantic similarity level (1-7) between two words.
 * Returns null if the API call fails (graceful degradation — game continues
 * with default gap).
 */
export async function computeSimilarityLevel(
  word1: string,
  word2: string
): Promise<number | null> {
  try {
    const [embedding1, embedding2] = await Promise.all([
      getEmbedding(word1),
      getEmbedding(word2),
    ]);

    const similarity = cosineSimilarity(embedding1, embedding2);
    const level = similarityToLevel(similarity);
    console.log(`Similarity: "${word1}" vs "${word2}" → score=${similarity.toFixed(3)}, level=${level}`);
    return level;
  } catch (error) {
    console.error("Failed to compute similarity:", error);
    return null;
  }
}
