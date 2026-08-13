// Port of the Python SentenceGenerator from typing-trainer-pro.

export type Difficulty = "easy" | "medium" | "hard";

const POOLS = {
  easy: {
    nouns: ["cat","dog","bird","car","book","house","tree","ball","girl","boy","mom","dad","sun","moon","fish","frog","star","door","bell","cake","duck","hand","foot","rain"],
    verbs: ["run","jump","play","read","eat","sleep","swim","sing","dance","draw","walk","talk","see","like","make","help","find","give","take","hold","pull","push","sit","stand"],
    adjs: ["big","small","red","blue","happy","sad","fast","slow","hot","cold","new","old","good","bad","tall","short","soft","hard","wet","dry","clean","dark","bright","empty"],
    advs: ["quickly","slowly","happily","loudly","softly","well","badly","fast","gently","neatly","eagerly","bravely","cheerfully","silently"],
  },
  medium: {
    nouns: ["student","teacher","computer","garden","library","market","window","bottle","picture","journey","village","problem","message","concert","restaurant","mountain","captain","doctor","bridge","castle","dinner","engine","forest","guitar"],
    verbs: ["discover","imagine","prepare","explore","describe","consider","arrange","collect","connect","develop","explain","improve","observe","perform","receive","suggest","complete","deliver","encourage","establish","generate","identify"],
    adjs: ["beautiful","interesting","important","different","difficult","comfortable","expensive","friendly","helpful","popular","serious","strange","terrible","wonderful","ancient","modern","brilliant","curious","elegant","famous","generous","humble"],
    advs: ["carefully","easily","finally","generally","immediately","perfectly","probably","suddenly","usually","actually","certainly","completely","exactly","naturally","recently","positively","regularly","similarly"],
  },
  hard: {
    nouns: ["hypothesis","phenomenon","methodology","implementation","configuration","infrastructure","collaboration","algorithm","equilibrium","biodiversity","consciousness","civilization","jurisdiction","philosophy","sustainability","entrepreneur","accountability","authentication","cryptography","determinism"],
    verbs: ["synchronize","extrapolate","disseminate","corroborate","differentiate","encapsulate","facilitate","incorporate","orchestrate","perpetuate","reconcile","scrutinize","substantiate","transcend","validate","calibrate","conceptualize","decentralize"],
    adjs: ["unprecedented","paradoxical","multifaceted","heterogeneous","indispensable","ephemeral","ubiquitous","meticulous","ambivalent","cognizant","dichotomous","exponential","intrinsic","juxtaposed","quintessential","reciprocal","authoritative","comprehensive"],
    advs: ["unequivocally","paradoxically","simultaneously","consequently","nevertheless","furthermore","notwithstanding","subsequently","invariably","predominantly","exponentially","intrinsically","ostensibly","concurrently","categorically","indisputably"],
  },
} as const;

const TEMPLATES: Record<Difficulty, string[]> = {
  easy: [
    "The {adj} {noun} {verb}s.",
    "A {noun} can {verb}.",
    "I {verb} the {adj} {noun}.",
    "{noun}s {verb} {adv}.",
    "This {noun} is {adj}.",
    "My {noun} likes to {verb}.",
    "The {noun} is very {adj}.",
    "We {verb} the {noun}.",
    "She has a {adj} {noun}.",
    "He {verb}s every day.",
    "The {adj} {noun} {verb}s {adv}.",
    "Can you {verb} the {noun}?",
  ],
  medium: [
    "The {adj} {noun} {adv} {verb}s the {noun}.",
    "A {adj} {noun} can {adv} {verb} the {noun}.",
    "I {adv} {verb} the {adj} {noun} in the {noun}.",
    "The {noun} {verb}s {adv} because it is {adj}.",
    "After the {noun}, we {adv} {verb} the {adj} {noun}.",
    "The {adj} {noun} and the {adj} {noun} {verb} together.",
    "She {adv} {verb}s the {adj} {noun} for her {noun}.",
    "It is {adj} to {verb} the {noun} {adv}.",
    "Many {noun}s {adv} {verb} the {adj} {noun}.",
    "Why does the {adj} {noun} {verb} {adv}?",
    "The {adj} {noun}, however, {verb}s {adv}.",
  ],
  hard: [
    "The {adj} {noun}, which was {adv} {adj}, {verb}ed the {adj} {noun}.",
    "Although the {adj} {noun} {adv} {verb}ed, the {adj} {noun} remained {adj}.",
    "The {adj} {noun} {adv} {verb}ed the {adj} {noun}; consequently, the {noun} became {adj}.",
    "If the {adj} {noun} {verb}s {adv}, then the {adj} {noun} will {adv} {verb}.",
    "Having {adv} {verb}ed the {adj} {noun}, the {noun} felt {adj} and {adj}.",
    "Not only did the {adj} {noun} {verb} {adv}, but it also {adv} {verb}ed the {noun}.",
    "Because the {adj} {noun} was {adv} {adj}, the {noun} {adv} {verb}ed the {adj} {noun}.",
    "What if the {adj} {noun} had {adv} {verb}ed the {adj} {noun}?",
    "Either the {adj} {noun} {verb}s {adv}, or the {adj} {noun} will {verb} {adv}.",
  ],
};

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)] as T;

function fill(template: string, d: Difficulty): string {
  const p = POOLS[d];
  return template.replace(/\{(noun|verb|adj|adv)\}/g, (_m, kind: string) => {
    if (kind === "noun") return pick(p.nouns);
    if (kind === "verb") return pick(p.verbs);
    if (kind === "adj") return pick(p.adjs);
    return pick(p.advs);
  });
}

function tidy(s: string): string {
  return s.replace(/\ss\b/g, "s").replace(/\s+/g, " ").trim();
}

const history: string[] = [];

export function generateSentence(difficulty: Difficulty): string {
  for (let i = 0; i < 20; i++) {
    const s = tidy(fill(pick(TEMPLATES[difficulty]), difficulty));
    if (!history.includes(s)) {
      history.push(s);
      if (history.length > 10) history.shift();
      return s;
    }
  }
  return tidy(fill(pick(TEMPLATES[difficulty]), difficulty));
}

/** Build a passage of roughly `minChars` characters. */
export function generatePassage(difficulty: Difficulty, minChars = 220): string {
  const parts: string[] = [];
  let len = 0;
  while (len < minChars) {
    const s = generateSentence(difficulty);
    parts.push(s);
    len += s.length + 1;
  }
  return parts.join(" ");
}
