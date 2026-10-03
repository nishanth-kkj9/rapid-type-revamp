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

export function getQuoteLengthCategory(text: string): "short" | "medium" | "long" {
  if (text.length < 100) return "short";
  if (text.length < 200) return "medium";
  return "long";
}

interface RawQuote {
  id: string;
  text: string;
  author: string;
  source?: string;
}

const RAW_QUOTES: RawQuote[] = [
  // Short quotes (<100 chars)
  {
    id: "q1",
    text: "Simplicity is prerequisite for reliability.",
    author: "Edsger W. Dijkstra",
  },
  {
    id: "q2",
    text: "Talk is cheap. Show me the code.",
    author: "Linus Torvalds",
  },
  {
    id: "q3",
    text: "Stay hungry, stay foolish.",
    author: "Steve Jobs",
  },
  {
    id: "q4",
    text: "Knowledge is power.",
    author: "Francis Bacon",
  },
  {
    id: "q5",
    text: "Make it work, make it right, make it fast.",
    author: "Kent Beck",
  },
  {
    id: "q6",
    text: "Premature optimization is the root of all evil.",
    author: "Donald Knuth",
  },
  {
    id: "q7",
    text: "First, solve the problem. Then, write the code.",
    author: "John Johnson",
  },
  {
    id: "q8",
    text: "Experience is the name everyone gives to their mistakes.",
    author: "Oscar Wilde",
  },
  {
    id: "q9",
    text: "We can only see a short distance ahead, but we can see plenty there that needs to be done.",
    author: "Alan Turing",
    source: "Computing Machinery and Intelligence",
  },
  {
    id: "q10",
    text: "That brain of mine is something more than merely mortal, as time will show.",
    author: "Ada Lovelace",
  },
  {
    id: "q11",
    text: "The most disastrous thing that you can ever learn is your first programming language.",
    author: "Alan Kay",
  },
  {
    id: "q12",
    text: "Programs must be written for people to read, and only incidentally for machines to execute.",
    author: "Harold Abelson",
    source: "Structure and Interpretation of Computer Programs",
  },
  {
    id: "q13",
    text: "Somewhere, something incredible is waiting to be known.",
    author: "Carl Sagan",
  },
  {
    id: "q14",
    text: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.",
    author: "Buddha",
  },
  {
    id: "q15",
    text: "You have power over your mind, not outside events. Realize this, and you will find strength.",
    author: "Marcus Aurelius",
    source: "Meditations",
  },
  {
    id: "q16",
    text: "It is not that I am so smart, but I stay with the questions much longer.",
    author: "Albert Einstein",
  },
  {
    id: "q17",
    text: "Walking on water and developing software from a specification are easy if both are frozen.",
    author: "Edward V. Berard",
  },
  {
    id: "q18",
    text: "The computer was born to solve problems that did not exist before.",
    author: "Bill Gates",
  },

  // Medium quotes (100 - 199 chars)
  {
    id: "q20",
    text: "I have noticed that even people who claim everything is predestined, and that we can do nothing to change it, look before they cross the road.",
    author: "Stephen Hawking",
    source: "Black Holes and Baby Universes",
  },
  {
    id: "q21",
    text: "Space is big. You just won't believe how vastly, hugely, mind-bogglingly big it is. You may think it's a long way down the road to the chemist's, but that's just peanuts to space.",
    author: "Douglas Adams",
    source: "The Hitchhiker's Guide to the Galaxy",
  },
  {
    id: "q22",
    text: "The question of whether machines can think is about as relevant as the question of whether submarines can swim.",
    author: "Edsger W. Dijkstra",
  },
  {
    id: "q23",
    text: "The Analytical Engine weaves algebraical patterns just as the Jacquard loom weaves flowers and leaves. It operates on numbers as the signs of operations.",
    author: "Ada Lovelace",
  },
  {
    id: "q24",
    text: "When we recognize our place in an immensity of light-years, when we grasp the intricacy, beauty, and subtlety of life, that soaring feeling is surely spiritual.",
    author: "Carl Sagan",
    source: "The Demon-Haunted World",
  },
  {
    id: "q25",
    text: "Here's to the crazy ones, the misfits, the rebels, the troublemakers, the round pegs in the square holes. The ones who see things differently.",
    author: "Steve Jobs",
  },
  {
    id: "q26",
    text: "The most dangerous phrase in the language is, 'We've always done it this way.' You don't manage people; you manage things. You lead people.",
    author: "Grace Hopper",
  },
  {
    id: "q27",
    text: "If I have seen further it is by standing on the shoulders of Giants. Nature is pleased with simplicity, and nature affects not the pomp of superfluous causes.",
    author: "Isaac Newton",
  },
  {
    id: "q28",
    text: "The first principle is that you must not fool yourself and you are the easiest person to fool. Science is a way of trying not to fool yourself.",
    author: "Richard Feynman",
  },
  {
    id: "q29",
    text: "Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.",
    author: "Antoine de Saint-Exupéry",
    source: "Airman's Odyssey",
  },
  {
    id: "q30",
    text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
    author: "Martin Fowler",
    source: "Refactoring",
  },
  {
    id: "q31",
    text: "Simple things should be simple, complex things should be possible. The best way to predict the future is to invent it.",
    author: "Alan Kay",
  },

  // Long quotes (200+ chars)
  {
    id: "q19",
    text: "A computer is like a violin. You can imagine a novice trying first a phonograph and then a violin. The latter, requiring months of practice, seems less promising. But the possibilities of the violin are so much greater.",
    author: "Marvin Minsky",
  },
  {
    id: "q32",
    text: "Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal. Now we are engaged in a great civil war.",
    author: "Abraham Lincoln",
    source: "Gettysburg Address",
  },
  {
    id: "q33",
    text: "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of light, it was the season of darkness.",
    author: "Charles Dickens",
    source: "A Tale of Two Cities",
  },
  {
    id: "q34",
    text: "Three passions, simple but overwhelmingly strong, have governed my life: the longing for love, the search for knowledge, and unbearable pity for the suffering of mankind. These passions, like great winds, have blown me hither and thither.",
    author: "Bertrand Russell",
    source: "Autobiography",
  },
  {
    id: "q35",
    text: "We may hope that machines will eventually compete with men in all purely intellectual fields. But which are the best ones to start with? Even this is a difficult decision. Many people think that a very abstract activity, like the playing of chess, would be best.",
    author: "Alan Turing",
    source: "Computing Machinery and Intelligence",
  },
  {
    id: "q36",
    text: "Look again at that dot. That's here. That's home. That's us. On it everyone you love, everyone you know, everyone you ever heard of, every human being who ever was, lived out their lives. The aggregate of our joy and suffering.",
    author: "Carl Sagan",
    source: "Pale Blue Dot",
  },
  {
    id: "q37",
    text: "Nothing is more painful to the human mind than, after the feelings have been worked up by a quick succession of events, the dead calmness of inaction and certainty which follows, and deprives the soul both of hope and fear.",
    author: "Mary Shelley",
    source: "Frankenstein",
  },
];

export const QUOTES: QuoteItem[] = RAW_QUOTES.map((q) => ({
  ...q,
  length: getQuoteLengthCategory(q.text),
}));

export function getRandomQuote(length?: "short" | "medium" | "long"): QuoteItem {
  const filtered = length ? QUOTES.filter((q) => q.length === length) : QUOTES;
  const pool = filtered.length > 0 ? filtered : QUOTES;
  return pool[Math.floor(Math.random() * pool.length)] as QuoteItem;
}
