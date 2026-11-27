import wordLists from "./wordLists.json";
import { scoreWordForWeakTargets } from "./keyStats";

export type WordListId = "200" | "1000";

export interface TextGenerationOptions {
  wordList: WordListId;
  punctuation?: boolean | undefined;
  numbers?: boolean | undefined;
  capitals?: boolean | undefined;
}

const COMMON_200: readonly string[] = wordLists.easy.slice(0, 200);
const COMMON_1000: readonly string[] = Array.from(
  new Set([...wordLists.easy, ...wordLists.medium]),
).slice(0, 1000);
const ALL_WORDS: readonly string[] = Array.from(
  new Set([...wordLists.easy, ...wordLists.medium, ...wordLists.hard]),
);

export const WORD_LISTS: Record<WordListId, readonly string[]> = {
  "200": COMMON_200,
  "1000": COMMON_1000,
};

export function getWordPool(wordList: WordListId): readonly string[] {
  return WORD_LISTS[wordList];
}

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)] as T;

function capitalizeWord(word: string): string {
  return word.length === 0 ? word : `${word[0]!.toUpperCase()}${word.slice(1)}`;
}

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
}

function wouldExceedWindow(
  trailingTokens: readonly string[],
  candidateWords: readonly string[],
): boolean {
  const combined = [...trailingTokens.slice(-19), ...candidateWords];
  for (let start = 0; start < combined.length; start++) {
    const counts = new Map<string, number>();
    const end = Math.min(combined.length, start + 20);
    for (let i = start; i < end; i++) {
      const tok = normalizeToken(combined[i]!);
      if (!tok) continue;
      const next = (counts.get(tok) ?? 0) + 1;
      if (next > 2) return true;
      counts.set(tok, next);
    }
  }
  return false;
}

function generateWordStream(
  targetWordCount: number,
  options: {
    wordList: WordListId;
    punctuation?: boolean;
    numbers?: boolean;
    capitals?: boolean;
  },
): string {
  const pool = getWordPool(options.wordList);
  const punctMarks = [",", ".", ";", "?"];
  const tokens: string[] = [];

  for (let i = 0; i < targetWordCount; i++) {
    if (
      options.numbers &&
      i > 0 &&
      Math.random() < 0.12 &&
      !/^\d/.test(tokens[tokens.length - 1] ?? "")
    ) {
      const numVal =
        options.wordList === "1000" && Math.random() < 0.35
          ? `${10 + Math.floor(Math.random() * 89)}.${1 + Math.floor(Math.random() * 9)}`
          : String(10 + Math.floor(Math.random() * 990));
      tokens.push(numVal);
      continue;
    }

    let word = pick(pool);
    for (let attempt = 0; attempt < 25; attempt++) {
      const candidate = pick(pool);
      if (!wouldExceedWindow(tokens, [candidate])) {
        word = candidate;
        break;
      }
    }

    if (options.capitals && (i === 0 || Math.random() < 0.18)) {
      word = capitalizeWord(word);
    }
    if (options.punctuation && i < targetWordCount - 1 && Math.random() < 0.16) {
      word = `${word}${pick(punctMarks)}`;
    }
    tokens.push(word);
  }

  return tokens.join(" ");
}

/** Build a word-stream passage from the selected frequency word list and toggles. */
export function generatePassage(
  wordList: WordListId,
  minChars = 220,
  options?: Omit<TextGenerationOptions, "wordList">,
): string {
  let text = "";
  const wordsPerChunk = Math.max(25, Math.ceil(minChars / 5));
  while (text.length < minChars) {
    const chunk = generateWordStream(wordsPerChunk, {
      wordList,
      punctuation: options?.punctuation ?? false,
      numbers: options?.numbers ?? false,
      capitals: options?.capitals ?? false,
    });
    text = text ? `${text} ${chunk}` : chunk;
  }
  return text;
}

/**
 * Generate a passage containing an exact number of words for Words Mode.
 */
export function generateWordQuota(
  count: number,
  wordList: WordListId = "200",
  options?: Omit<TextGenerationOptions, "wordList">,
): string {
  return generateWordStream(count, {
    wordList,
    punctuation: options?.punctuation ?? false,
    numbers: options?.numbers ?? false,
    capitals: options?.capitals ?? false,
  });
}

/**
 * Build an adaptive drill targeting both weak single keys and weak two-letter bigrams.
 */
export function generateAdaptiveWeakDrill(
  weakKeys: readonly string[],
  weakBigrams: readonly string[] = [],
  targetCount = 45,
): string {
  if (weakKeys.length === 0 && weakBigrams.length === 0) {
    return generateWordStream(targetCount, { wordList: "200" });
  }

  const scored = ALL_WORDS.map((word) => ({
    word,
    score: scoreWordForWeakTargets(word, weakKeys, weakBigrams),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return generateWordStream(targetCount, { wordList: "200" });
  }

  const topPool = scored.slice(0, Math.min(80, scored.length)).map((s) => s.word);
  const out: string[] = [];
  let cursor = 0;

  while (out.length < targetCount) {
    const windowSlice = topPool.slice(0, Math.min(topPool.length, 28));
    let chosen = windowSlice[cursor % windowSlice.length]!;
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = pick(topPool);
      if (!wouldExceedWindow(out, [candidate])) {
        chosen = candidate;
        break;
      }
    }
    out.push(chosen);
    cursor += 1;
  }

  return out.join(" ");
}

/**
 * Generate a targeted remediation drill focusing on words the user struggled with.
 */
export function generateMissedWordsDrill(missedWords: string[], targetCount = 20): string {
  if (missedWords.length === 0) return generateWordQuota(targetCount, "200");
  const cleanWords = missedWords.map((w) => w.trim()).filter((w) => w.length > 0);
  if (cleanWords.length === 0) return generateWordQuota(targetCount, "200");

  const fillers = ["the", "and", "with", "from", "that", "this", "have", "will", "your", "more"];
  const result: string[] = [];
  let i = 0;
  while (result.length < targetCount) {
    const target = cleanWords[i % cleanWords.length] as string;
    result.push(target);
    if (result.length < targetCount) {
      const filler = fillers[Math.floor(Math.random() * fillers.length)] as string;
      result.push(filler);
    }
    i++;
  }
  return result.join(" ");
}
