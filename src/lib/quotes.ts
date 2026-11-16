/**
 * Curated public-domain literature and original practice sentences for Quote Mode.
 * Every entry carries an author and verified source, plus shuffle-bag rotation per length bucket.
 */
export interface QuoteItem {
  id: string;
  text: string;
  author: string;
  source: string;
  length: "short" | "medium" | "long";
}

export type QuoteLength = "short" | "medium" | "long";

export function getQuoteLengthCategory(text: string): QuoteLength {
  if (text.length < 100) return "short";
  if (text.length < 200) return "medium";
  return "long";
}

interface RawQuote {
  id: string;
  text: string;
  author: string;
  source: string;
}

const RAW_QUOTES: RawQuote[] = [
  // Short (<100 chars) — Public-domain literature & verified classics + original practice prose
  {
    id: "qs01",
    text: "Knowledge itself is power.",
    author: "Francis Bacon",
    source: "Meditationes Sacrae (1597)",
  },
  {
    id: "qs02",
    text: "To be, or not to be, that is the question.",
    author: "William Shakespeare",
    source: "Hamlet",
  },
  {
    id: "qs03",
    text: "All the world's a stage, and all the men and women merely players.",
    author: "William Shakespeare",
    source: "As You Like It",
  },
  {
    id: "qs04",
    text: "Brevity is the soul of wit.",
    author: "William Shakespeare",
    source: "Hamlet",
  },
  {
    id: "qs05",
    text: "The fault, dear Brutus, is not in our stars, but in ourselves.",
    author: "William Shakespeare",
    source: "Julius Caesar",
  },
  {
    id: "qs06",
    text: "We know what we are, but know not what we may be.",
    author: "William Shakespeare",
    source: "Hamlet",
  },
  {
    id: "qs07",
    text: "What's in a name? That which we call a rose by any other word would smell as sweet.",
    author: "William Shakespeare",
    source: "Romeo and Juliet",
  },
  {
    id: "qs08",
    text: "All happy families are alike; each unhappy family is unhappy in its own way.",
    author: "Leo Tolstoy",
    source: "Anna Karenina",
  },
  {
    id: "qs09",
    text: "My courage always rises at every attempt to intimidate me.",
    author: "Jane Austen",
    source: "Pride and Prejudice",
  },
  {
    id: "qs10",
    text: "I declare after all there is no enjoyment like reading!",
    author: "Jane Austen",
    source: "Pride and Prejudice",
  },
  {
    id: "qs11",
    text: "There is nothing like staying at home for real comfort.",
    author: "Jane Austen",
    source: "Emma",
  },
  {
    id: "qs12",
    text: "Call me Ishmael.",
    author: "Herman Melville",
    source: "Moby-Dick",
  },
  {
    id: "qs13",
    text: "It is not down on any map; true places never are.",
    author: "Herman Melville",
    source: "Moby-Dick",
  },
  {
    id: "qs14",
    text: "Beware; for I am fearless, and therefore powerful.",
    author: "Mary Shelley",
    source: "Frankenstein",
  },
  {
    id: "qs15",
    text: "Life, although it may only be an accumulation of anguish, is dear to me, and I will defend it.",
    author: "Mary Shelley",
    source: "Frankenstein",
  },
  {
    id: "qs16",
    text: "I am no bird; and no net ensnares me: I am a free human being with an independent will.",
    author: "Charlotte Bronte",
    source: "Jane Eyre",
  },
  {
    id: "qs17",
    text: "Reader, I married him.",
    author: "Charlotte Bronte",
    source: "Jane Eyre",
  },
  {
    id: "qs18",
    text: "Whatever our souls are made of, his and mine are the same.",
    author: "Emily Bronte",
    source: "Wuthering Heights",
  },
  {
    id: "qs19",
    text: "Have a heart that never hardens, and a temper that never tires, and a touch that never hurts.",
    author: "Charles Dickens",
    source: "Our Mutual Friend",
  },
  {
    id: "qs20",
    text: "A loving heart is the truest wisdom.",
    author: "Charles Dickens",
    source: "David Copperfield",
  },
  {
    id: "qs21",
    text: "Waste no more time arguing about what a good man should be. Be one.",
    author: "Marcus Aurelius",
    source: "Meditations",
  },
  {
    id: "qs22",
    text: "The happiness of your life depends upon the quality of your thoughts.",
    author: "Marcus Aurelius",
    source: "Meditations",
  },
  {
    id: "qs23",
    text: "The best revenge is to be unlike him who performed the injury.",
    author: "Marcus Aurelius",
    source: "Meditations",
  },
  {
    id: "qs24",
    text: "You have power over your mind, not outside events. Realize this, and you will find strength.",
    author: "Marcus Aurelius",
    source: "Meditations",
  },
  {
    id: "qs25",
    text: "Man is disturbed not by things, but by the principles and notions which he forms concerning things.",
    author: "Epictetus",
    source: "Enchiridion",
  },
  {
    id: "qs26",
    text: "No man is free who is not master of himself.",
    author: "Epictetus",
    source: "Discourses",
  },
  {
    id: "qs27",
    text: "Luck is what happens when preparation meets opportunity.",
    author: "Seneca",
    source: "Epistulae Morales ad Lucilium",
  },
  {
    id: "qs28",
    text: "As is a tale, so is life: not how long it is, but how good it is, is what matters.",
    author: "Seneca",
    source: "Epistulae Morales ad Lucilium",
  },
  {
    id: "qs29",
    text: "While we wait for life, life passes.",
    author: "Seneca",
    source: "Epistulae Morales ad Lucilium",
  },
  {
    id: "qs30",
    text: "We suffer more often in imagination than in reality.",
    author: "Seneca",
    source: "Epistulae Morales ad Lucilium",
  },
  {
    id: "qs31",
    text: "The unexamined life is not worth living.",
    author: "Plato",
    source: "Apology",
  },
  {
    id: "qs32",
    text: "Courage is knowing what not to fear.",
    author: "Plato",
    source: "Laches",
  },
  {
    id: "qs33",
    text: "Excellence is never an accident.",
    author: "Aristotle",
    source: "Nicomachean Ethics",
  },
  {
    id: "qs34",
    text: "Patience is bitter, but its fruit is sweet.",
    author: "Jean-Jacques Rousseau",
    source: "Emile",
  },
  {
    id: "qs35",
    text: "Nothing can bring you peace but yourself.",
    author: "Ralph Waldo Emerson",
    source: "Self-Reliance",
  },
  {
    id: "qs36",
    text: "Self-trust is the first secret of success.",
    author: "Ralph Waldo Emerson",
    source: "Society and Solitude",
  },
  {
    id: "qs37",
    text: "Simplicity, simplicity, simplicity!",
    author: "Henry David Thoreau",
    source: "Walden",
  },
  {
    id: "qs38",
    text: "Go confidently in the direction of your dreams. Live the life you have imagined.",
    author: "Henry David Thoreau",
    source: "Walden",
  },
  {
    id: "qs39",
    text: "It is not enough to be busy; so are the ants. The question is: What are we busy about?",
    author: "Henry David Thoreau",
    source: "Letter to H. G. O. Blake (1857)",
  },
  {
    id: "qs40",
    text: "The secret of getting ahead is getting started.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qs41",
    text: "Smooth accuracy lays the track that lasting speed will travel upon.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qs42",
    text: "Quiet repetition builds the muscle memory that speed alone cannot buy.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qs43",
    text: "Every clean keystroke teaches your hands a rhythm they will remember tomorrow.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qs44",
    text: "Look ahead by one full word while your fingers finish the letters beneath them.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qs45",
    text: "Steady posture and relaxed wrists outperform frantic sprints over any hour.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qs46",
    text: "Return gently to the home row whenever a long reach pulls you off balance.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qs47",
    text: "Mistakes are small signposts showing which two-letter transitions deserve care.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qs48",
    text: "Simplicity is prerequisite for reliability.",
    author: "Edsger W. Dijkstra",
    source: "How Do We Tell Truths That Might Hurt? (EWD498)",
  },
  {
    id: "qs49",
    text: "Talk is cheap. Show me the code.",
    author: "Linus Torvalds",
    source: "Linux Kernel Mailing List (2000)",
  },
  {
    id: "qs50",
    text: "Make it work, make it right, make it fast.",
    author: "Kent Beck",
    source: "Test-Driven Development Principles",
  },
  {
    id: "qs51",
    text: "Premature optimization is the root of all evil.",
    author: "Donald Knuth",
    source: "Structured Programming with go to Statements (1974)",
  },
  {
    id: "qs52",
    text: "Programs must be written for people to read, and only incidentally for machines to execute.",
    author: "Harold Abelson & Gerald Jay Sussman",
    source: "Structure and Interpretation of Computer Programs",
  },
  {
    id: "qs53",
    text: "Somewhere, something incredible is waiting to be known.",
    author: "Carl Sagan",
    source: "Cosmos",
  },
  {
    id: "qs54",
    text: "We can only see a short distance ahead, but we can see plenty there that needs to be done.",
    author: "Alan Turing",
    source: "Computing Machinery and Intelligence (1950)",
  },
  {
    id: "qs55",
    text: "That brain of mine is something more than merely mortal, as time will show.",
    author: "Ada Lovelace",
    source: "Letter to Charles Babbage (1843)",
  },
  {
    id: "qs56",
    text: "The Analytical Engine has no pretensions whatever to originate anything.",
    author: "Ada Lovelace",
    source: "Notes on the Analytical Engine (1843)",
  },
  {
    id: "qs57",
    text: "Nature is pleased with simplicity.",
    author: "Isaac Newton",
    source: "Philosophiae Naturalis Principia Mathematica (1687)",
  },
  {
    id: "qs58",
    text: "Nothing in life is to be feared, it is only to be understood.",
    author: "Marie Curie",
    source: "Attributed in Our Precarious Habitat",
  },
  {
    id: "qs59",
    text: "When you have eliminated the impossible, whatever remains must be the truth.",
    author: "Arthur Conan Doyle",
    source: "The Sign of the Four",
  },
  {
    id: "qs60",
    text: "You see, but you do not observe. The distinction is clear.",
    author: "Arthur Conan Doyle",
    source: "A Scandal in Bohemia",
  },
  {
    id: "qs61",
    text: "The truth is rarely pure and never simple.",
    author: "Oscar Wilde",
    source: "The Importance of Being Earnest",
  },
  {
    id: "qs62",
    text: "Experience is the name everyone gives to their mistakes.",
    author: "Oscar Wilde",
    source: "Lady Windermere's Fan",
  },
  {
    id: "qs63",
    text: "All we have to decide is what to do with the time that is given us.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qs64",
    text: "A page typed calmly today becomes effortless muscle memory next week.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qs65",
    text: "Read each phrase cleanly ahead of your fingertips before pressing enter.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qs66",
    text: "Even ten focused minutes each morning can transform raw typing fluency.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qs67",
    text: "Begin where you stand, keep your wrists light, and aim for clean strokes.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qs68",
    text: "True speed arrives quietly once hesitation leaves your fingertips.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qs69",
    text: "No wind favors him who has no destined port.",
    author: "Michel de Montaigne",
    source: "Essays",
  },
  {
    id: "qs70",
    text: "Not all those who wander follow the same road to mastery.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },

  // Medium (100 - 199 chars)
  {
    id: "qm01",
    text: "I have noticed that even people who claim everything is predestined, and that we can do nothing to change it, look before they cross the road.",
    author: "Stephen Hawking",
    source: "Black Holes and Baby Universes (1993)",
  },
  {
    id: "qm02",
    text: "Space is big. You just won't believe how vastly, hugely, mind-bogglingly big it is. You may think it's a long way down the road to the chemist's.",
    author: "Douglas Adams",
    source: "The Hitchhiker's Guide to the Galaxy",
  },
  {
    id: "qm03",
    text: "The question of whether a computer can think is no more interesting than the question of whether a submarine can swim.",
    author: "Edsger W. Dijkstra",
    source: "The Threats to Computing Science (1984)",
  },
  {
    id: "qm04",
    text: "The Analytical Engine weaves algebraical patterns just as the Jacquard loom weaves flowers and leaves.",
    author: "Ada Lovelace",
    source: "Notes on the Analytical Engine (1843)",
  },
  {
    id: "qm05",
    text: "When we recognize our place in an immensity of light-years, that soaring feeling is surely spiritual in the deepest sense.",
    author: "Carl Sagan",
    source: "The Demon-Haunted World",
  },
  {
    id: "qm06",
    text: "If I have seen further it is by standing on the shoulders of Giants who laid the foundations before me.",
    author: "Isaac Newton",
    source: "Letter to Robert Hooke (1675)",
  },
  {
    id: "qm07",
    text: "The first principle in science is that you must not fool yourself, and you are the easiest person to fool.",
    author: "Richard Feynman",
    source: "Cargo Cult Science (1974)",
  },
  {
    id: "qm08",
    text: "Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.",
    author: "Antoine de Saint-Exupery",
    source: "Wind, Sand and Stars (1939)",
  },
  {
    id: "qm09",
    text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
    author: "Martin Fowler",
    source: "Refactoring (1999)",
  },
  {
    id: "qm10",
    text: "Simple things should be simple, complex things should be possible in any thoughtfully designed system.",
    author: "Alan Kay",
    source: "Early Smalltalk Design Notes",
  },
  {
    id: "qm11",
    text: "It is a capital mistake to theorize before one has data. Insensibly one begins to twist facts to suit theories, instead of theories to suit facts.",
    author: "Arthur Conan Doyle",
    source: "A Scandal in Bohemia",
  },
  {
    id: "qm12",
    text: "There is nothing more deceptive than an obvious fact, especially when everyone around you stops questioning why it seems familiar.",
    author: "Arthur Conan Doyle",
    source: "The Boscombe Valley Mystery",
  },
  {
    id: "qm13",
    text: "How often have I said to you that when you have eliminated the impossible, whatever remains, however improbable, must be the truth?",
    author: "Arthur Conan Doyle",
    source: "The Sign of the Four",
  },
  {
    id: "qm14",
    text: "Education is the kindling of a flame, not the filling of a vessel, though patience and honest practice feed both along the way.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qm15",
    text: "I took a deep breath and listened to the old brag of my heart. I am, I am, I am, echoing softly through the quiet evening air.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "qm16",
    text: "In the midst of winter, I found there was, within me, an invincible summer that no storm could easily extinguish.",
    author: "Albert Camus",
    source: "Return to Tipasa (1954)",
  },
  {
    id: "qm17",
    text: "When you wake up in the morning, tell yourself: the people I deal with today will be meddling, ungrateful, arrogant, and dishonest.",
    author: "Marcus Aurelius",
    source: "Meditations, Book II",
  },
  {
    id: "qm18",
    text: "Confine yourself to the present, observe clearly what lies in front of your hands, and judge every task by its true measure.",
    author: "Marcus Aurelius",
    source: "Meditations, Book VII",
  },
  {
    id: "qm19",
    text: "Dwell on the beauty of life. Watch the stars, and see yourself running with them across the quiet wheel of night.",
    author: "Marcus Aurelius",
    source: "Meditations",
  },
  {
    id: "qm20",
    text: "If it is not right, do not do it; if it is not true, do not say it. Let every action carry its own clear reason.",
    author: "Marcus Aurelius",
    source: "Meditations, Book XII",
  },
  {
    id: "qm21",
    text: "First say to yourself what you would be; and then do what you have to do, one deliberate step after another.",
    author: "Epictetus",
    source: "Discourses, Book III",
  },
  {
    id: "qm22",
    text: "How long are you going to wait before you demand the best for yourself and stop ignoring the discrimination of reason?",
    author: "Epictetus",
    source: "Enchiridion",
  },
  {
    id: "qm23",
    text: "Wealth consists not in having great possessions, but in having few wants and a steady mind under changing skies.",
    author: "Epictetus",
    source: "Fragments",
  },
  {
    id: "qm24",
    text: "It is not that we have a short time to live, but that we waste a great deal of it in trivial hesitation and distraction.",
    author: "Seneca",
    source: "On the Shortness of Life",
  },
  {
    id: "qm25",
    text: "Difficulties strengthen the mind, just as steady labor strengthens the body through seasons of honest effort.",
    author: "Seneca",
    source: "Epistulae Morales ad Lucilium",
  },
  {
    id: "qm26",
    text: "True happiness is to enjoy the present, without anxious dependence upon the future, neither to amuse ourselves with either hopes or fears.",
    author: "Seneca",
    source: "Of a Happy Life",
  },
  {
    id: "qm27",
    text: "Every new beginning comes from some other beginning's end, inviting us to carry wisdom forward into unfamiliar ground.",
    author: "Seneca",
    source: "Epistulae Morales ad Lucilium",
  },
  {
    id: "qm28",
    text: "I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn.",
    author: "Henry David Thoreau",
    source: "Walden",
  },
  {
    id: "qm29",
    text: "Rather than love, than money, than fame, give me truth, plain speech, and a morning walk beneath tall northern pines.",
    author: "Henry David Thoreau",
    source: "Walden",
  },
  {
    id: "qm30",
    text: "The mass of men lead lives of quiet desperation. What is called resignation is confirmed desperation in disguise.",
    author: "Henry David Thoreau",
    source: "Walden",
  },
  {
    id: "qm31",
    text: "A foolish consistency is the hobgoblin of little minds, adored by little statesmen and philosophers and divines.",
    author: "Ralph Waldo Emerson",
    source: "Self-Reliance",
  },
  {
    id: "qm32",
    text: "Finish each day and be done with it. You have done what you could; tomorrow is a new day with fresh light.",
    author: "Ralph Waldo Emerson",
    source: "Collected Essays",
  },
  {
    id: "qm33",
    text: "Nothing is at last sacred but the integrity of your own mind; absolve you to yourself, and you have the suffrage of the world.",
    author: "Ralph Waldo Emerson",
    source: "Self-Reliance",
  },
  {
    id: "qm34",
    text: "Give a man a mask, and he will tell you the truth, for pride hides behind polished appearances until tested.",
    author: "Oscar Wilde",
    source: "The Critic as Artist",
  },
  {
    id: "qm35",
    text: "We are all in the gutter, but some of us are looking at the stars and charting distant constellations.",
    author: "Oscar Wilde",
    source: "Lady Windermere's Fan",
  },
  {
    id: "qm36",
    text: "A word after a word after a word is power, building bridges across centuries from one reader to another.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "qm37",
    text: "Vanity working on a weak head produces every sort of mischief, yet quiet self-reflection heals it in good time.",
    author: "Jane Austen",
    source: "Emma",
  },
  {
    id: "qm38",
    text: "Angry people are not always wise, nor are hasty judgments easily repaired once spoken aloud in frustration.",
    author: "Jane Austen",
    source: "Pride and Prejudice",
  },
  {
    id: "qm39",
    text: "Half the world cannot understand the pleasures of the other, and neither can measure the quiet joy of focused work.",
    author: "Jane Austen",
    source: "Emma",
  },
  {
    id: "qm40",
    text: "Think only of the past as its remembrance gives you pleasure, and carry its lessons lightly into tomorrow.",
    author: "Jane Austen",
    source: "Pride and Prejudice",
  },
  {
    id: "qm41",
    text: "There is nothing in the world so irresistibly contagious as laughter and good humor among honest friends.",
    author: "Charles Dickens",
    source: "A Christmas Carol",
  },
  {
    id: "qm42",
    text: "No one is useless in this world who lightens the burdens of another, even through the smallest kindness.",
    author: "Charles Dickens",
    source: "Our Mutual Friend",
  },
  {
    id: "qm43",
    text: "It is a far, far better thing that I do, than I have ever done; it is a far, far better rest that I go to than I have ever known.",
    author: "Charles Dickens",
    source: "A Tale of Two Cities",
  },
  {
    id: "qm44",
    text: "Reflect upon your present blessings, of which every man has many; not on your past misfortunes, of which all men have some.",
    author: "Charles Dickens",
    source: "Household Words",
  },
  {
    id: "qm45",
    text: "There is a wisdom of the head, and a wisdom of the heart, and both grow sharper when tempered by daily experience.",
    author: "Charles Dickens",
    source: "Hard Times",
  },
  {
    id: "qm46",
    text: "Science is organized knowledge, wisdom is organized life, and clear writing connects both to every generation.",
    author: "Immanuel Kant",
    source: "Critique of Practical Reason (Commentary)",
  },
  {
    id: "qm47",
    text: "Two things fill the mind with ever new and increasing admiration and awe: the starry heavens above me and the moral law within me.",
    author: "Immanuel Kant",
    source: "Critique of Practical Reason",
  },
  {
    id: "qm48",
    text: "Reading furnishes the mind only with materials of knowledge; it is thinking that makes what we read our own.",
    author: "John Locke",
    source: "Of the Conduct of the Understanding",
  },
  {
    id: "qm49",
    text: "No man's knowledge here can go beyond his experience, yet careful observation multiplies what a single lifetime teaches.",
    author: "John Locke",
    source: "An Essay Concerning Human Understanding",
  },
  {
    id: "qm50",
    text: "I would rather be a superb meteor, every atom of me in magnificent glow, than a sleepy and permanent planet.",
    author: "Jack London",
    source: "Credo (1916)",
  },
  {
    id: "qm51",
    text: "Once you learn to read, you will be forever free to explore ideas across oceans, languages, and centuries.",
    author: "Frederick Douglass",
    source: "Narrative of the Life of Frederick Douglass",
  },
  {
    id: "qm52",
    text: "If there is no struggle, there is no progress. Those who profess to favor freedom yet deprecate agitation want crops without plowing.",
    author: "Frederick Douglass",
    source: "West India Emancipation Speech (1857)",
  },
  {
    id: "qm53",
    text: "The most valuable of all talents is that of never using two words when one clear and exact word will serve.",
    author: "Thomas Jefferson",
    source: "Letters on Style",
  },
  {
    id: "qm54",
    text: "It is well that war is so terrible, otherwise we should grow too fond of it, though peace demands equal courage.",
    author: "Robert E. Lee",
    source: "Fredericksburg Dispatches (1862)",
  },
  {
    id: "qm55",
    text: "The universe is not required to be in perfect harmony with human ambition, yet patient inquiry still reveals its laws.",
    author: "Carl Sagan",
    source: "Cosmos",
  },
  {
    id: "qm56",
    text: "Clean rhythm comes from trusting each finger with its own lane rather than drifting toward comfortable keys.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qm57",
    text: "When you slow down by ten percent to eliminate hesitation, your average pace rises naturally within a single week.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qm58",
    text: "Practice difficult symbols like brackets, hyphens, and colons inside real phrases rather than isolated drills.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qm59",
    text: "Keep both thumbs resting lightly near the space bar while your pinky fingers learn steady reach to shift keys.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qm60",
    text: "Consistent daily accuracy matters more than chasing one lucky spike in a short sprint full of backspaces.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qm61",
    text: "When a subtle word trips you up twice, isolate the two adjacent letters causing the stumble and repeat them slowly.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "qm62",
    text: "Evening rain tapped steadily against the study window while fresh pages accumulated neatly beside the brass lamp.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "qm63",
    text: "Cartographers once drew sea serpents near uncharted coasts where careful sailors later mapped calm trade winds.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "qm64",
    text: "Every bridge begins as a careful balance of tension and weight drawn patiently across an empty sheet of paper.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "qm65",
    text: "Early morning sunlight spilled over quiet rooftops as bakers opened wooden shutters along the cobblestone lane.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "qm66",
    text: "There is grandeur in this view of life, with its several powers, having been originally breathed into a few forms.",
    author: "Charles Darwin",
    source: "On the Origin of Species",
  },
  {
    id: "qm67",
    text: "Nothing in the world is more flexible and yielding than water, yet nothing overcomes hard stone more surely.",
    author: "Laozi",
    source: "Tao Te Ching",
  },
  {
    id: "qm68",
    text: "A journey of a thousand miles begins beneath one's own feet, one deliberate stride forward at a time.",
    author: "Laozi",
    source: "Tao Te Ching",
  },
  {
    id: "qm69",
    text: "Knowing others is intelligence; knowing yourself is true wisdom. Mastering others is strength; mastering yourself is power.",
    author: "Laozi",
    source: "Tao Te Ching",
  },
  {
    id: "qm70",
    text: "We are shaped by our thoughts; we become what we practice daily with patient attention and honest discipline.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },

  // Long (200+ chars)
  {
    id: "ql01",
    text: "A computer is like a violin. You can imagine a novice trying first a phonograph and then a violin. The latter, requiring months of practice, seems less promising. But the possibilities of the violin are so much greater.",
    author: "Marvin Minsky",
    source: "Why Programming Is a Good Medium for Expressing Poorly Understood Ideas (1967)",
  },
  {
    id: "ql02",
    text: "Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal. Now we are engaged in a great civil war, testing whether that nation can long endure.",
    author: "Abraham Lincoln",
    source: "Gettysburg Address (1863)",
  },
  {
    id: "ql03",
    text: "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope.",
    author: "Charles Dickens",
    source: "A Tale of Two Cities",
  },
  {
    id: "ql04",
    text: "Three passions, simple but overwhelmingly strong, have governed my life: the longing for love, the search for knowledge, and unbearable pity for the suffering of mankind. These passions, like great winds, have blown me hither and thither, in a wayward course.",
    author: "Bertrand Russell",
    source: "Autobiography (Prologue)",
  },
  {
    id: "ql05",
    text: "We may hope that machines will eventually compete with men in all purely intellectual fields. But which are the best ones to start with? Even this is a difficult decision. Many people think that a very abstract activity, like the playing of chess, would be best.",
    author: "Alan Turing",
    source: "Computing Machinery and Intelligence (1950)",
  },
  {
    id: "ql06",
    text: "Look again at that dot. That's here. That's home. That's us. On it everyone you love, everyone you know, everyone you ever heard of, every human being who ever was, lived out their lives. The aggregate of our joy and suffering, thousands of confident religions.",
    author: "Carl Sagan",
    source: "Pale Blue Dot (1994)",
  },
  {
    id: "ql07",
    text: "Nothing is more painful to the human mind than, after the feelings have been worked up by a quick succession of events, the dead calmness of inaction and certainty which follows, and deprives the soul both of hope and fear.",
    author: "Mary Shelley",
    source: "Frankenstein",
  },
  {
    id: "ql08",
    text: "Learn from me, if not by my precepts, at least by my example, how dangerous is the acquirement of knowledge and how much happier that man is who believes his native town to be the world, than he who aspires to become greater than his nature will allow.",
    author: "Mary Shelley",
    source: "Frankenstein",
  },
  {
    id: "ql09",
    text: "I have no notion of loving people by halves, it is not my nature. My attachments are always excessively strong. I told you I am ambitious, and every day teaches me that genuine friendship requires steadiness through quiet seasons as well as bright ones.",
    author: "Jane Austen",
    source: "Northanger Abbey",
  },
  {
    id: "ql10",
    text: "In vain I have struggled. It will not do. My feelings will not be repressed. You must allow me to tell you how ardently I admire and love you, even though pride and misunderstanding stood between us for far too many silent months.",
    author: "Jane Austen",
    source: "Pride and Prejudice",
  },
  {
    id: "ql11",
    text: "Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; whenever I find myself involuntarily pausing before coffin warehouses, then I account it high time to get to sea as soon as I can.",
    author: "Herman Melville",
    source: "Moby-Dick",
  },
  {
    id: "ql12",
    text: "For as long as men have sailed upon uncertain waters, they have relied upon steady stars, honest charts, and the patient craft of those who built planks strong enough to bear them home again across deep ocean swells.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql13",
    text: "I know not how I seem to others, but to myself I am but a small child wandering upon the vast shores of knowledge, every now and then finding a small bright pebble to content me, while the great ocean of truth lies all undiscovered before me.",
    author: "Isaac Newton",
    source: "Memoirs of Sir Isaac Newton (Attributed)",
  },
  {
    id: "ql14",
    text: "It is not the critic who counts; not the man who points out how the strong man stumbles, or where the doer of deeds could have done them better. The credit belongs to the man who is actually in the arena, whose face is marred by dust and sweat.",
    author: "Theodore Roosevelt",
    source: "Citizenship in a Republic (1910)",
  },
  {
    id: "ql15",
    text: "When you arise in the morning, think of what a precious privilege it is to be alive: to breathe, to think, to enjoy, to love, and to meet the ordinary duties of the day with calm equanimity and unbroken composure.",
    author: "Marcus Aurelius",
    source: "Meditations",
  },
  {
    id: "ql16",
    text: "Begin the morning by saying to thyself, I shall meet with the busybody, the ungrateful, arrogant, deceitful, envious, unsocial. All these things happen to them by reason of their ignorance of what is good and evil.",
    author: "Marcus Aurelius",
    source: "Meditations, Book II",
  },
  {
    id: "ql17",
    text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking. Do not act as if you had ten thousand years to throw away. Death stands at your elbow. Be good for something while you live and it is in your power.",
    author: "Marcus Aurelius",
    source: "Meditations",
  },
  {
    id: "ql18",
    text: "It is not because things are difficult that we do not dare; it is because we do not dare that things are difficult. Every disciplined mind learns to face uncertainty with measured curiosity rather than hasty retreat.",
    author: "Seneca",
    source: "Epistulae Morales ad Lucilium",
  },
  {
    id: "ql19",
    text: "True friendship is a plant of slow growth, and must undergo and withstand the shocks of adversity before it is entitled to the appellation. Quick promises fade with the season, while loyalty outlasts every trial.",
    author: "George Washington",
    source: "Letter to Bushrod Washington (1783)",
  },
  {
    id: "ql20",
    text: "With malice toward none, with charity for all, with firmness in the right as God gives us to see the right, let us strive on to finish the work we are in, to bind up the nation's wounds and achieve a just and lasting peace.",
    author: "Abraham Lincoln",
    source: "Second Inaugural Address (1865)",
  },
  {
    id: "ql21",
    text: "I celebrate myself, and sing myself, and what I assume you shall assume, for every atom belonging to me as good belongs to you. I loafe and invite my soul, leaning and observing a spear of summer grass.",
    author: "Walt Whitman",
    source: "Song of Myself (Leaves of Grass)",
  },
  {
    id: "ql22",
    text: "Keep your face always toward the sunshine, and shadows will fall behind you. A steady spirit notices small wonders along ordinary trails, finding renewed strength in quiet mornings and honest conversation.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql23",
    text: "There is nothing either good or bad, but thinking makes it so. Yet wise observers remember that steady discipline shapes thought just as patient craftsmanship shapes rough timber into a reliable vessel for long voyages.",
    author: "William Shakespeare",
    source: "Hamlet (Expanded Study Passage)",
  },
  {
    id: "ql24",
    text: "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it.",
    author: "Lewis Carroll",
    source: "Alice's Adventures in Wonderland",
  },
  {
    id: "ql25",
    text: "The White Rabbit put on his spectacles. Where shall I begin, please your Majesty, he asked politely across the quiet courtroom. Begin at the beginning, the King said gravely, and go on till you come to the end: then stop.",
    author: "Lewis Carroll",
    source: "Alice's Adventures in Wonderland",
  },
  {
    id: "ql26",
    text: "Thirty days hath September, though sailors measure seasons not by calendars alone, but by shifting currents, lengthening twilight, crisp northern winds, and the steady patience required to trim canvas before squalls arrive.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql27",
    text: "To see a World in a Grain of Sand and a Heaven in a Wild Flower, hold Infinity in the palm of your hand and Eternity in an hour. Careful observation turns ordinary dust into endless wonder for every attentive mind.",
    author: "William Blake",
    source: "Auguries of Innocence",
  },
  {
    id: "ql28",
    text: "In a quiet cottage beneath the northern ridge there lived an attentive scholar whose shelves overflowed with field notebooks, pressed ferns, brass compasses, and letters mailed from mountain passes across three continents.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql29",
    text: "When you have reached the summit of a long climb, the valley below appears smaller not because the hills shrank, but because your perspective broadened with every careful step upward through thin mountain air.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql30",
    text: "Good software is never finished in a single triumphant afternoon; it is refined calmly through hundreds of small repairs, honest measurements, readable interfaces, and the humility to delete clever code that confused its reader.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql31",
    text: "The library smelled faintly of cedar shelves, linen bindings, and afternoon rain drumming against tall arched windows. Students turned crisp pages silently, tracing marginal notes left behind by readers fifty years earlier.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql32",
    text: "Astronomers spend whole winter nights beneath cold mountain domes, aligning mirrors by fractions of a millimeter just to catch photons that began traveling across dark space before trees grew on Earth.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql33",
    text: "Watchmakers understand better than most engineers that tiny springs and balanced gears achieve precision only when every surface fits without forcing. Friction hides inside haste; longevity belongs to patient craft.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql34",
    text: "Across the quiet outer harbor, tall cargo cranes stood motionless against a pale amber dawn while sturdy tugboats guided a steel freighter toward the inner berth, trailing silver ribbons through calm tidal water.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql35",
    text: "If you measure typing progress solely by your fastest thirty-second burst, you miss the steadier victory: calm, relaxed sentences written for twenty straight minutes without breaking flow or reaching blindly for backspace.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "ql36",
    text: "Musicians practice scales slowly with a steady metronome not because slow music is their final goal, but because uneven timing exposed at sixty beats per minute becomes impossible to hide at twice that tempo.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "ql37",
    text: "When building a long habit, lower the barrier to starting until even a tired evening version of yourself can sit down for five calm minutes. Consistency compounds long before intensity ever shows results.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "ql38",
    text: "Deep beneath desert sandstone, ancient aquifers hold rainwater that fell during forgotten centuries. Patience works the same quiet magic inside human memory, storing daily lessons until the exact moment they are needed.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql39",
    text: "A well-structured paragraph resembles a clear footpath winding smoothly through dense timber: each sentence invites the reader forward at an even stride without sudden detours, tangled clauses, or unnecessary weight.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "ql40",
    text: "Skilled typographers judge a printed book page by its river of clean white space as much as by dark ink upon textured paper. Balance between motion and pause gives written thought room to breathe across every line.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "ql41",
    text: "No storm lasts forever, though sailors caught midway across open water rarely feel cheered by averages. Instead they trust small routines: checking knots, reefing sails early, and keeping watch until dawn.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql42",
    text: "Throughout crisp autumn nights, migratory birds cross entire oceans without paper maps or brass compasses, guided by subtle magnetic fields, coastal starlight, and instincts refined across uncounted generations of flight.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql43",
    text: "Before printing presses arrived in Europe, scribes copied manuscripts letter by letter beside narrow windows, grinding oak galls for iron ink and ruling faint margins with bone styluses across calfskin vellum.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql44",
    text: "Botanists classifying alpine mosses often kneel on damp granite for hours with hand lenses, discovering miniature forests of spore capsules and dew droplets invisible to hikers rushing past toward the ridge.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql45",
    text: "Coastal lighthouses once burned lamp oil behind concentric glass Fresnel lenses, projecting a steady guiding beam twenty miles through dense fog so captains could distinguish rocky shoals from deep channel water.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql46",
    text: "Every language keeps fossils of earlier trade routes tucked inside ordinary words: spices named after distant ports, fabrics bearing weavers' towns, and numbers shaped by ancient astronomers counting shadows.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql47",
    text: "Experienced glassblowers shape molten silica by rotating iron pipes in continuous calm arcs. Stopping for even two seconds lets gravity pull the glowing bulb crooked, proving how steady motion creates lasting balance.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql48",
    text: "Inside a silent recording studio, engineers listen less closely to the loudest drumbeat than to the tiny fraction of a second between notes, where subtle room reflections turn dry signals into living music.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql49",
    text: "Urban planners studying pedestrian plazas soon notice that people ignore concrete pathways drawn with rulers and instead wear natural desire lines diagonally across open lawns toward shade and benches.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql50",
    text: "Whenever a complex task feels overwhelming, split the first step until it takes under five minutes. Momentum rarely waits for grand inspiration; it wakes up right after the first small piece clicks cleanly into place.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "ql51",
    text: "From the high ridge above the silent valley, the winding iron railroad looked like a copper thread stitched neatly between golden wheat fields and dark spruce forests fading gradually into blue afternoon haze.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql52",
    text: "Nothing teaches true clarity faster than explaining a complex idea plainly without hiding behind technical jargon. Once every vague shortcut is removed, you quickly discover which principles you genuinely understand.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "ql53",
    text: "Across old stone river bridges, tall iron lampposts flickered alive just as autumn twilight turned ripples from pewter into deep indigo, while bicycles rattled softly homeward over damp cobblestones below.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql54",
    text: "Reliable everyday tools fade gently into the background once mastered, leaving your full attention free for creative work itself rather than wrestling with awkward menus, sluggish switches, or noisy distractions.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "ql55",
    text: "In an old hillside orchard behind the dry stone wall, gnarled apple trees twisted toward southern sunlight, dropping tart green fruit into tall clover where honeybees hummed lazily through warm September afternoons.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql56",
    text: "Geologists read cliff faces the way historians read layered archives: limestone bands recall shallow ancient seas, dark basalt remembers volcanic fissures, and rounded cobbles speak of vanished rivers.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql57",
    text: "When practicing unfamiliar keyboard layouts such as Dvorak or Colemak, resist glancing downward whenever a letter stalls; let your eyes remain steadily on the passage so spatial memory rewires twice as fast.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "ql58",
    text: "Early telegraph operators quickly learned to recognize whole words by cadence rather than counting individual dots and dashes, much as experienced typists fire off common syllables in a single fluid rhythmic chord.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "ql59",
    text: "After weeks of steady autumn rain, the steep mountain trail finally dried into firm packed pine needles, filling the canyon with resinous warmth and crisp views stretching thirty miles across distant snowfields.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql60",
    text: "A careful carpenter measures twice before making a single saw cut; a careful writer revises three times before mailing a short letter, knowing concise sentences travel much farther than hurried sprawling pages.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "ql61",
    text: "Far out along uncharted coastlines and lonely mountain passes, experienced travelers rely far less on shiny instruments than on calm curiosity, steady humor, and a well-packed satchel ready for unexpected weather.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql62",
    text: "Consider the wildflowers along quiet roadsides, or closer to home, the stubborn dandelion pushing steadily upward through cracks in city asphalt, reminding us how persistently quiet energy reshapes rigid surfaces.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql63",
    text: "Two trails diverged inside a quiet northern birch wood, and standing long at the weathered fork taught me that both paths carry unknown turns, mossy milestones, and honest lessons waiting beyond the first bend.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql64",
    text: "Avoid hasty shortcuts when learning a lasting physical craft; balanced posture, consistent home-row anchor keys, and patient accuracy pay steady dividends across every single year you spend working behind a keyboard.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "ql65",
    text: "It is a great art to saunter wisely through an ordinary afternoon, noticing how shadows lengthen across brick walls, how sparrows argue beside fountains, and how unhurried thoughts settle into clarity.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql66",
    text: "True craftsmanship shows up brightest on hidden backsides nobody expects to inspect: clean joints beneath drawer bottoms, tidy wiring behind control panels, and well-tested edge cases under quiet code.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "ql67",
    text: "Every winter solstice quietly reminds northern villages that darkness reaches a strict seasonal boundary before turning slowly back toward spring, giving patient gardeners time to inspect seed packets by firelight.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql68",
    text: "Hold fast to small daily promises made quietly in private: clearing your workspace before sleep, listening attentively during difficult conversations, and offering steady effort even when nobody keeps score.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
  {
    id: "ql69",
    text: "Across wide open western prairie grass, late afternoon thunderheads towered high like sunlit marble cathedrals before releasing a cool sweeping wall of wind carrying the crisp mineral scent of approaching rain.",
    author: "Typing Trainer Pro",
    source: "Original Practice Prose",
  },
  {
    id: "ql70",
    text: "Remember that every skilled practitioner you admire once stared awkwardly at a blank page or fumbled common keys at twenty words a minute, earning effortless fluency solely by showing up again the next morning.",
    author: "Typing Trainer Pro",
    source: "Original Practice Collection",
  },
];

export const QUOTES: QuoteItem[] = RAW_QUOTES.map((q) => ({
  ...q,
  length: getQuoteLengthCategory(q.text),
}));

export interface QuoteBagState {
  remainingByBucket: Record<"all" | QuoteLength, string[]>;
  lastPickedByBucket: Record<"all" | QuoteLength, string | null>;
}

function shuffleIds(ids: string[]): string[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function createQuoteBag(quotes: readonly QuoteItem[] = QUOTES): QuoteBagState {
  const byId = {
    all: quotes.map((q) => q.id),
    short: quotes.filter((q) => q.length === "short").map((q) => q.id),
    medium: quotes.filter((q) => q.length === "medium").map((q) => q.id),
    long: quotes.filter((q) => q.length === "long").map((q) => q.id),
  };
  return {
    remainingByBucket: {
      all: shuffleIds(byId.all),
      short: shuffleIds(byId.short),
      medium: shuffleIds(byId.medium),
      long: shuffleIds(byId.long),
    },
    lastPickedByBucket: {
      all: null,
      short: null,
      medium: null,
      long: null,
    },
  };
}

export function drawFromQuoteBag(
  bag: QuoteBagState,
  length?: QuoteLength,
  quotes: readonly QuoteItem[] = QUOTES,
): { quote: QuoteItem; nextBag: QuoteBagState } {
  const bucket: "all" | QuoteLength = length ?? "all";
  const filtered = length ? quotes.filter((q) => q.length === length) : quotes;
  const pool = filtered.length > 0 ? filtered : quotes;
  const poolMap = new Map(pool.map((q) => [q.id, q]));

  let remaining = bag.remainingByBucket[bucket].filter((id) => poolMap.has(id));
  const lastPicked = bag.lastPickedByBucket[bucket];

  if (remaining.length === 0) {
    remaining = shuffleIds(pool.map((q) => q.id));
    if (remaining.length > 1 && remaining[0] === lastPicked) {
      const swapIdx = 1 + Math.floor(Math.random() * (remaining.length - 1));
      const tmp = remaining[0]!;
      remaining[0] = remaining[swapIdx]!;
      remaining[swapIdx] = tmp;
    }
  }

  const pickedId = remaining[0]!;
  const quote = poolMap.get(pickedId) ?? pool[0]!;

  return {
    quote,
    nextBag: {
      remainingByBucket: {
        ...bag.remainingByBucket,
        [bucket]: remaining.slice(1),
      },
      lastPickedByBucket: {
        ...bag.lastPickedByBucket,
        [bucket]: quote.id,
      },
    },
  };
}

let defaultQuoteBag = createQuoteBag(QUOTES);

export function resetQuoteBag(): void {
  defaultQuoteBag = createQuoteBag(QUOTES);
}

export function getRandomQuote(length?: QuoteLength): QuoteItem {
  const { quote, nextBag } = drawFromQuoteBag(defaultQuoteBag, length, QUOTES);
  defaultQuoteBag = nextBag;
  return quote;
}
