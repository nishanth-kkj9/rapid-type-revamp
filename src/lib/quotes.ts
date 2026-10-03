/**
 * Curated literature, philosophy, and computing quotes for Quote Mode typing practice.
 */
export interface QuoteItem {
  id: string;
  text: string;
  author: string;
  source?: string;
  length: "short" | "medium" | "long";
}

export const QUOTES: QuoteItem[] = [
  // Short quotes (<100 chars)
  {
    id: "q1",
    text: "Simplicity is prerequisite for reliability.",
    author: "Edsger W. Dijkstra",
    length: "short",
  },
  {
    id: "q2",
    text: "Talk is cheap. Show me the code.",
    author: "Linus Torvalds",
    length: "short",
  },
  {
    id: "q3",
    text: "Stay hungry, stay foolish.",
    author: "Steve Jobs",
    length: "short",
  },
  {
    id: "q4",
    text: "Knowledge is power.",
    author: "Francis Bacon",
    length: "short",
  },
  {
    id: "q5",
    text: "Make it work, make it right, make it fast.",
    author: "Kent Beck",
    length: "short",
  },
  {
    id: "q6",
    text: "Premature optimization is the root of all evil.",
    author: "Donald Knuth",
    length: "short",
  },
  {
    id: "q7",
    text: "First, solve the problem. Then, write the code.",
    author: "John Johnson",
    length: "short",
  },
  {
    id: "q8",
    text: "Experience is the name everyone gives to their mistakes.",
    author: "Oscar Wilde",
    length: "short",
  },

  // Medium quotes (100 - 200 chars)
  {
    id: "q9",
    text: "We can only see a short distance ahead, but we can see plenty there that needs to be done.",
    author: "Alan Turing",
    source: "Computing Machinery and Intelligence",
    length: "medium",
  },
  {
    id: "q10",
    text: "That brain of mine is something more than merely mortal, as time will show.",
    author: "Ada Lovelace",
    length: "medium",
  },
  {
    id: "q11",
    text: "The most disastrous thing that you can ever learn is your first programming language.",
    author: "Alan Kay",
    length: "medium",
  },
  {
    id: "q12",
    text: "Programs must be written for people to read, and only incidentally for machines to execute.",
    author: "Harold Abelson",
    source: "Structure and Interpretation of Computer Programs",
    length: "medium",
  },
  {
    id: "q13",
    text: "Somewhere, something incredible is waiting to be known.",
    author: "Carl Sagan",
    length: "medium",
  },
  {
    id: "q14",
    text: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.",
    author: "Buddha",
    length: "medium",
  },
  {
    id: "q15",
    text: "You have power over your mind, not outside events. Realize this, and you will find strength.",
    author: "Marcus Aurelius",
    source: "Meditations",
    length: "medium",
  },
  {
    id: "q16",
    text: "It is not that I am so smart, but I stay with the questions much longer.",
    author: "Albert Einstein",
    length: "medium",
  },
  {
    id: "q17",
    text: "Walking on water and developing software from a specification are easy if both are frozen.",
    author: "Edward V. Berard",
    length: "medium",
  },
  {
    id: "q18",
    text: "The computer was born to solve problems that did not exist before.",
    author: "Bill Gates",
    length: "medium",
  },

  // Long quotes (200+ chars)
  {
    id: "q19",
    text: "A computer is like a violin. You can imagine a novice trying first a phonograph and then a violin. The latter, requiring months of practice, seems less promising. But the possibilities of the violin are so much greater.",
    author: "Marvin Minsky",
    length: "long",
  },
  {
    id: "q20",
    text: "I have noticed that even people who claim everything is predestined, and that we can do nothing to change it, look before they cross the road. One cannot base one's conduct on the idea that everything is determined.",
    author: "Stephen Hawking",
    source: "Black Holes and Baby Universes",
    length: "long",
  },
  {
    id: "q21",
    text: "Space is big. You just won't believe how vastly, hugely, mind-bogglingly big it is. You may think it's a long way down the road to the chemist's, but that's just peanuts to space. Listen, and remember that stars are vast distances apart.",
    author: "Douglas Adams",
    source: "The Hitchhiker's Guide to the Galaxy",
    length: "long",
  },
  {
    id: "q22",
    text: "The question of whether machines can think is about as relevant as the question of whether submarines can swim. We should aim to understand thought as deeply as we understand aerodynamics in modern computer systems.",
    author: "Edsger W. Dijkstra",
    length: "long",
  },
  {
    id: "q23",
    text: "The Analytical Engine weaves algebraical patterns just as the Jacquard loom weaves flowers and leaves. It operates on numbers as the signs of operations, establishing a new and silent language for future computation.",
    author: "Ada Lovelace",
    length: "long",
  },
  {
    id: "q24",
    text: "When we recognize our place in an immensity of light-years, when we grasp the intricacy, beauty, and subtlety of life, that soaring feeling is surely spiritual. We are made of starstuff exploring the cosmos together.",
    author: "Carl Sagan",
    source: "The Demon-Haunted World",
    length: "long",
  },
];

export function getRandomQuote(length?: "short" | "medium" | "long"): QuoteItem {
  const filtered = length ? QUOTES.filter((q) => q.length === length) : QUOTES;
  const pool = filtered.length > 0 ? filtered : QUOTES;
  return pool[Math.floor(Math.random() * pool.length)] as QuoteItem;
}
