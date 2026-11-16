import wordLists from "./wordLists.json";
import {
  DETERMINERS_PL,
  DETERMINERS_SG,
  PREPOSITIONS,
  getGrammarPool,
  type NounEntry,
} from "./grammarPools";
import { scoreWordForWeakTargets } from "./keyStats";

export type Difficulty = "easy" | "medium" | "hard";
export type TextStyle = "words" | "sentences";

export interface TextGenerationOptions {
  difficulty: Difficulty;
  style?: TextStyle | undefined;
  punctuation?: boolean | undefined;
  numbers?: boolean | undefined;
  capitals?: boolean | undefined;
  recent?: readonly string[] | undefined;
}

const EASY_WORDS: readonly string[] = wordLists.easy;
const MEDIUM_WORDS: readonly string[] = Array.from(
  new Set([...wordLists.easy, ...wordLists.medium]),
);
const HARD_WORDS: readonly string[] = Array.from(
  new Set([...wordLists.easy, ...wordLists.medium, ...wordLists.hard]),
);

export const WORD_LISTS: Record<Difficulty, readonly string[]> = {
  easy: EASY_WORDS,
  medium: MEDIUM_WORDS,
  hard: HARD_WORDS,
};

export function getWordPool(difficulty: Difficulty): readonly string[] {
  return WORD_LISTS[difficulty];
}

const IRREGULAR_PAST: Record<string, string> = {
  run: "ran",
  eat: "ate",
  swim: "swam",
  sit: "sat",
  stand: "stood",
  hold: "held",
  see: "saw",
  make: "made",
  give: "gave",
  take: "took",
  find: "found",
  sleep: "slept",
  feel: "felt",
  bring: "brought",
  think: "thought",
  teach: "taught",
  build: "built",
  drive: "drove",
  write: "wrote",
  read: "read",
  speak: "spoke",
  keep: "kept",
  draw: "drew",
  grow: "grew",
  sing: "sang",
  leave: "left",
  understand: "understood",
};

export function pastTense(verb: string): string {
  const irr = IRREGULAR_PAST[verb];
  if (irr) return irr;
  if (verb.endsWith("e")) return `${verb}d`;
  if (/[^aeiou]y$/.test(verb)) return `${verb.slice(0, -1)}ied`;
  return `${verb}ed`;
}

const IRREGULAR_THIRD_PERSON: Record<string, string> = {
  have: "has",
  do: "does",
  go: "goes",
  be: "is",
};

export function thirdPerson(verb: string): string {
  const irr = IRREGULAR_THIRD_PERSON[verb];
  if (irr) return irr;
  if (/[^aeiou]y$/.test(verb)) {
    return `${verb.slice(0, -1)}ies`;
  }
  if (/(?:[sxz]|[sc]h)$/.test(verb)) {
    return `${verb}es`;
  }
  return `${verb}s`;
}

const IRREGULAR_PLURALS: Record<string, string> = {
  fish: "fish",
  deer: "deer",
  sheep: "sheep",
  foot: "feet",
  tooth: "teeth",
  hypothesis: "hypotheses",
  phenomenon: "phenomena",
  criterion: "criteria",
  index: "indices",
  matrix: "matrices",
  nucleus: "nuclei",
  radius: "radii",
  thesis: "theses",
  craftsman: "craftsmen",
  man: "men",
  woman: "women",
  child: "children",
  person: "people",
  mouse: "mice",
};

export function plural(noun: string): string {
  const irr = IRREGULAR_PLURALS[noun];
  if (irr) return irr;
  if (noun.endsWith("sis")) return `${noun.slice(0, -3)}ses`;
  if (/[^aeiou]y$/.test(noun)) return `${noun.slice(0, -1)}ies`;
  if (/(?:[sxz]|[sc]h)$/.test(noun)) return `${noun}es`;
  if (noun.endsWith("fe")) return `${noun.slice(0, -2)}ves`;
  if (noun.endsWith("f") && !noun.endsWith("ff")) return `${noun.slice(0, -1)}ves`;
  if (noun.endsWith("us") && noun.length > 4) return `${noun}es`;
  return `${noun}s`;
}

const SILENT_H_WORDS = new Set([
  "hour",
  "hours",
  "hourly",
  "honest",
  "honestly",
  "honesty",
  "honor",
  "honors",
  "honorable",
  "honorary",
  "heir",
  "heirs",
  "heiress",
  "herb",
  "herbs",
  "herbal",
  "homage",
]);

const CONSONANT_SOUND_VOWEL_PREFIXES = [
  "uni",
  "use",
  "usu",
  "ute",
  "uti",
  "ura",
  "eu",
  "ukulele",
  "once",
  "one",
];

const VOWEL_SOUND_ACRONYMS = new Set([
  "api",
  "faq",
  "ftp",
  "html",
  "http",
  "https",
  "lcd",
  "led",
  "mba",
  "mp3",
  "mri",
  "nfc",
  "rss",
  "sdk",
  "sql",
  "ssh",
  "suv",
  "x-ray",
]);

/** Choose "a" or "an" by English pronunciation, not merely spelling. */
export function chooseArticle(nextWord: string, capitalize = false): string {
  const clean = nextWord.trim().replace(/^[^a-zA-Z0-9-]+/, "");
  const lower = clean.toLowerCase();
  let useAn = /^[aeiou]/i.test(lower);

  if (SILENT_H_WORDS.has(lower)) {
    useAn = true;
  } else if (VOWEL_SOUND_ACRONYMS.has(lower)) {
    useAn = true;
  } else if (lower === "url" || lower === "ui" || lower === "ux" || lower === "uuid") {
    useAn = false;
  } else if (CONSONANT_SOUND_VOWEL_PREFIXES.some((p) => lower.startsWith(p))) {
    // Words like university, unique, useful, uniform, European, one start with /j/ or /w/,
    // whereas words like uncle, umbrella, under start with /ʌ/.
    if (lower.startsWith("uni")) {
      useAn = /^(unimportant|uninformed|unintended|uninvited|uninteresting)/.test(lower);
    } else if (lower.startsWith("un")) {
      useAn = true;
    } else {
      useAn = false;
    }
  }

  const art = useAn ? "an" : "a";
  return capitalize ? `${art[0]!.toUpperCase()}${art.slice(1)}` : art;
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

function nounPlural(entry: NounEntry): string {
  return entry.pl ?? plural(entry.sg);
}

function buildNumberPhrase(): string {
  const templates = [
    () => `over ${12 + Math.floor(Math.random() * 88)} minutes`,
    () => `across ${2 + Math.floor(Math.random() * 48)} stations`,
    () => `around ${10 + Math.floor(Math.random() * 90)} percent`,
    () => `since ${1985 + Math.floor(Math.random() * 38)}`,
    () => `within ${3 + Math.floor(Math.random() * 27)} hours`,
    () => `near route ${10 + Math.floor(Math.random() * 89)}`,
  ];
  return pick(templates)();
}

function fixArticlesInText(raw: string): string {
  return raw.replace(/\b([Aa])\s+([a-zA-Z][a-zA-Z0-9-]*)/g, (_m, art: string, word: string) => {
    const cap = art === "A";
    return `${chooseArticle(word, cap)} ${word}`;
  });
}

function formatSentenceOptions(sentence: string, punctuation: boolean, capitals: boolean): string {
  let out = fixArticlesInText(sentence)
    .replace(/\s+([,.;:?!])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!punctuation) {
    out = out
      .replace(/[,.;:?!'"]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  if (!capitals) {
    out = out.toLowerCase();
  } else {
    out = capitalizeWord(out);
  }
  return out;
}

function buildGrammaticalSentence(
  difficulty: Difficulty,
  opts: { punctuation: boolean; numbers: boolean; capitals: boolean },
): string {
  const pool = getGrammarPool(difficulty);
  const sgN = () => pick(pool.sgNouns);
  const plN = () => (Math.random() < 0.25 ? pick(pool.plOnlyNouns) : nounPlural(sgN()));
  const adj = () => pick(pool.adjs);
  const adv = () => pick(pool.advs);
  const tv = () => pick(pool.transVerbs);
  const iv = () => pick(pool.intransVerbs);
  const detSg = () => pick(DETERMINERS_SG);
  const detPl = () => pick(DETERMINERS_PL);
  const prep = () => pick(PREPOSITIONS);
  const place = () => pick(pool.prepObjects);

  const subjSg = () =>
    Math.random() < 0.65 ? `${detSg()} ${adj()} ${sgN().sg}` : `${detSg()} ${sgN().sg}`;
  const subjPl = () =>
    Math.random() < 0.65 ? `${detPl()} ${adj()} ${plN()}` : `${detPl()} ${plN()}`;
  const objPhrase = () =>
    Math.random() < 0.5 ? `${detSg()} ${adj()} ${sgN().sg}` : `${detPl()} ${plN()}`;
  const tailNum = opts.numbers && Math.random() < 0.35 ? ` ${buildNumberPhrase()}` : "";

  const patterns: (() => string)[] = [
    // Singular subject + 3rd person singular verb + object
    () => `${subjSg()} ${thirdPerson(tv())} ${objPhrase()}${tailNum}.`,
    // Plural subject + base verb + object
    () => `${subjPl()} ${tv()} ${objPhrase()}${tailNum}.`,
    // Singular subject + adverb + 3rd person intransitive verb + prepositional phrase
    () => `${subjSg()} ${adv()} ${thirdPerson(iv())} ${prep()} the ${place()}${tailNum}.`,
    // Plural subject + adverb + base intransitive verb + prepositional phrase
    () => `${subjPl()} ${adv()} ${iv()} ${prep()} that ${place()}${tailNum}.`,
    // Linking verb agreement: singular "is/was" vs plural "are/were"
    () => `${subjSg()} is ${adj()} while ${subjPl()} remain ${adj()}.`,
    () => `${subjPl()} are ${adj()} because ${subjSg()} ${thirdPerson(iv())} ${adv()}.`,
    // Past tense (same verb form for singular or plural subject)
    () => `${subjSg()} ${pastTense(tv())} ${objPhrase()} ${prep()} our ${place()}${tailNum}.`,
    () => `${subjPl()} ${pastTense(iv())} ${adv()} after ${subjSg()} arrived.`,
    // Modal verb agreement (can / will + base verb)
    () => `${subjSg()} can ${tv()} ${objPhrase()} ${adv()}${tailNum}.`,
    () => `${subjPl()} will ${iv()} ${prep()} each ${adj()} ${place()}.`,
    // Compound sentence with semicolon/clause (Medium / Hard focus)
    () =>
      difficulty === "easy"
        ? `Can ${subjSg()} ${tv()} ${objPhrase()}?`
        : `Although ${subjSg()} seems ${adj()}, ${subjPl()} still ${tv()} ${objPhrase()}.`,
    () =>
      difficulty === "hard"
        ? `Whenever ${subjPl()} ${tv()} ${objPhrase()}, ${subjSg()} ${thirdPerson(tv())} ${objPhrase()}; consequently, results improve ${adv()}.`
        : `Before ${subjPl()} ${iv()}, ${subjSg()} ${thirdPerson(tv())} ${objPhrase()}.`,
  ];

  const raw = pick(patterns)();
  return formatSentenceOptions(raw, opts.punctuation, opts.capitals);
}

const DEDUPE_WINDOW = 12;

export function generateSentence(
  difficulty: Difficulty,
  recent: readonly string[] = [],
  opts: {
    punctuation?: boolean;
    numbers?: boolean;
    capitals?: boolean;
    trailingTokens?: readonly string[];
  } = {},
): { sentence: string; recent: string[] } {
  const genOpts = {
    punctuation: opts.punctuation ?? true,
    numbers: opts.numbers ?? false,
    capitals: opts.capitals ?? true,
  };
  const trailing = opts.trailingTokens ?? [];

  for (let i = 0; i < 30; i++) {
    const s = buildGrammaticalSentence(difficulty, genOpts);
    if (recent.includes(s)) continue;
    const tokens = s.split(/\s+/).filter(Boolean);
    if (wouldExceedWindow(trailing, tokens)) continue;
    return { sentence: s, recent: [...recent, s].slice(-DEDUPE_WINDOW) };
  }

  const fallback = buildGrammaticalSentence(difficulty, genOpts);
  return { sentence: fallback, recent: [...recent, fallback].slice(-DEDUPE_WINDOW) };
}

function generateWordStream(
  targetWordCount: number,
  options: {
    difficulty: Difficulty;
    punctuation?: boolean;
    numbers?: boolean;
    capitals?: boolean;
  },
): string {
  const pool = getWordPool(options.difficulty);
  const punctMarks = options.difficulty === "easy" ? [",", "."] : [",", ".", ";", "?"];
  const tokens: string[] = [];

  for (let i = 0; i < targetWordCount; i++) {
    if (
      options.numbers &&
      i > 0 &&
      Math.random() < 0.12 &&
      !/^\d/.test(tokens[tokens.length - 1] ?? "")
    ) {
      const numVal =
        options.difficulty === "hard" && Math.random() < 0.35
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

/** Build a passage with optional style (sentences vs frequency-ranked words) and toggles. */
export function generatePassage(
  difficulty: Difficulty,
  minChars = 220,
  options?: Omit<TextGenerationOptions, "difficulty">,
): string {
  const style: TextStyle = options?.style ?? "sentences";
  if (style === "words") {
    let text = "";
    const wordsPerChunk = Math.max(25, Math.ceil(minChars / 5));
    while (text.length < minChars) {
      const chunk = generateWordStream(wordsPerChunk, {
        difficulty,
        punctuation: options?.punctuation ?? false,
        numbers: options?.numbers ?? false,
        capitals: options?.capitals ?? false,
      });
      text = text ? `${text} ${chunk}` : chunk;
    }
    return text;
  }

  const parts: string[] = [];
  let recent: string[] = [...(options?.recent ?? [])];
  let trailingTokens: string[] = [];
  let currentText = "";

  while (currentText.length < minChars) {
    const next = generateSentence(difficulty, recent, {
      punctuation: options?.punctuation ?? true,
      numbers: options?.numbers ?? false,
      capitals: options?.capitals ?? true,
      trailingTokens,
    });
    recent = next.recent;
    parts.push(next.sentence);
    trailingTokens = [...trailingTokens, ...next.sentence.split(/\s+/).filter(Boolean)].slice(-19);
    currentText = parts.join(" ");
  }
  return currentText;
}

/**
 * Generate a passage containing an exact number of words for Words Mode.
 */
export function generateWordQuota(
  count: number,
  difficulty: Difficulty = "medium",
  options?: Omit<TextGenerationOptions, "difficulty">,
): string {
  const style: TextStyle = options?.style ?? "words";
  if (style === "words") {
    return generateWordStream(count, {
      difficulty,
      punctuation: options?.punctuation ?? false,
      numbers: options?.numbers ?? false,
      capitals: options?.capitals ?? false,
    });
  }

  const words: string[] = [];
  let recent: string[] = [];
  while (words.length < count) {
    const next = generateSentence(difficulty, recent, {
      punctuation: options?.punctuation ?? true,
      numbers: options?.numbers ?? false,
      capitals: options?.capitals ?? true,
      trailingTokens: words.slice(-19),
    });
    recent = next.recent;
    const split = next.sentence.split(/\s+/).filter(Boolean);
    for (const w of split) {
      if (words.length < count) words.push(w);
    }
  }
  return words.join(" ");
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
    return generateWordStream(targetCount, { difficulty: "medium" });
  }

  const scored = HARD_WORDS.map((word) => ({
    word,
    score: scoreWordForWeakTargets(word, weakKeys, weakBigrams),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return generateWordStream(targetCount, { difficulty: "medium" });
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
  if (missedWords.length === 0) return generateWordQuota(targetCount, "medium");
  const cleanWords = missedWords.map((w) => w.trim()).filter((w) => w.length > 0);
  if (cleanWords.length === 0) return generateWordQuota(targetCount, "medium");

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
