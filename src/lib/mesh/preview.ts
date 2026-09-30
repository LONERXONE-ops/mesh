import { providerById } from "./catalog";
import type { WorkMode } from "./types";

export interface PeerNote {
  name: string;
  excerpt: string;
}

export interface PreviewInput {
  modelId: string;
  mode: WorkMode;
  prompt: string;
  attachments: { name: string }[];
  ownHistory: string[];
  peers: PeerNote[];
}

function clip(text: string, n: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= n) return clean;
  return `${clean.slice(0, n - 1).trim()}…`;
}

function topic(prompt: string) {
  return clip(prompt, 140);
}

function fileNote(files: { name: string }[]) {
  if (!files.length) return "";
  const names = files.map((f) => f.name).join(", ");
  return `\n\nAttached: ${names}. Mesh can hold the file with the message, but it does not read the contents yet. That waits on the document pipeline, so this preview stays with what you wrote.`;
}

function peerNote(peers: PeerNote[]) {
  if (!peers.length) return "";
  const last = peers[peers.length - 1];
  return `Building on ${last.name}, who said “${clip(last.excerpt, 140)}”. `;
}

function branch(prompt: string) {
  const p = prompt.toLowerCase();
  if (/go-to-market|go to market|gtm|marketing/.test(p)) return "gtm" as const;
  if (/website|web site|landing page/.test(p)) return "web" as const;
  if (/risk/.test(p)) return "risk" as const;
  if (/quantum/.test(p)) return "quantum" as const;
  if (/roadmap|product plan/.test(p)) return "roadmap" as const;
  if (/user research|interview|usability/.test(p)) return "research" as const;
  if (/competit/.test(p)) return "compete" as const;
  if (/business idea|this idea/.test(p)) return "idea" as const;
  return "general" as const;
}

function gemini(kind: ReturnType<typeof branch>, ask: string) {
  if (kind === "gtm") {
    return `A simple go-to-market strategy for this type of business idea could focus on a lean, targeted approach. Start with a niche audience, validate the product with early adopters, and iterate based on feedback. Use content marketing and community building to create awareness, then scale with paid acquisition once you've proven product-market fit.`;
  }
  if (kind === "web") {
    return `Here are five website ideas you could consider:

1. A niche resource hub for a specific audience, with a clear reason to return each week.
2. A personal brand site that shows work, not slogans — three projects, the outcome, and who it was for.
3. A small tool that removes one annoying task (invoice reminder, habit check, or a shared budget).
4. A directory of trusted picks in one narrow field, written in your own voice.
5. A learning journal that publishes the work as you learn it, so the site is proof, not a pitch.`;
  }
  if (kind === "risk") {
    return `Key risks include market demand, competition, regulatory challenges, and operational execution. Validate each assumption early and build flexibility into your plan.

For “${ask}”, I would write the risk, the signal that would prove it, and the cheapest test — then only keep the ones that could actually kill the idea.`;
  }
  if (kind === "quantum") {
    return `Quantum mechanics is the rulebook for very small things: energy comes in steps, and a particle is described by probabilities until it interacts with something.

A useful picture is a light switch that can be partly on in the math, then becomes definitely on or off when you look. You do not need the full formalism to use the idea — you need to know that measurement changes the story, and that “small” here means atoms and electrons, not just tiny objects.`;
  }
  if (kind === "roadmap") {
    return `A practical product roadmap for “${ask}”:

1. Now — one job the product does well for one kind of person.
2. Next — the loop that makes them come back (save, share, or finish).
3. Later — only the expansions that the first loop proved people want.

Keep the roadmap as a sequence of bets, not a feature catalog.`;
  }
  if (kind === "research") {
    return `For user research on “${ask}”, talk to five people who already feel the problem. Ask what they did last time, not what they would like. Record the workaround, the moment they gave up, and what they paid (time or money). Patterns across those five are enough to change the plan.`;
  }
  if (kind === "compete") {
    return `A competitive read of “${ask}” starts with substitutes, not logos. What do people use today, including the spreadsheet or the group chat? Note where those alternatives are good enough. Your opening is the gap they tolerate, not a longer feature list.`;
  }
  if (kind === "idea") {
    return `A useful way to understand a business idea is to name four things in one sitting:

1. Who feels the problem this week, not “everyone”.
2. What they do now when it shows up.
3. What you would charge, and why that is cheaper than the workaround.
4. The smallest version that would earn a yes.

You have not described the idea itself yet — paste it and I can pressure-test those four against the actual offer.`;
  }
  return `Here is a direct way to work with “${ask}”.

Separate what you already know from what you are assuming. The known part can be acted on. The assumed part needs one cheap test, not more planning.

Then pick a next step you could finish in a day: a paragraph, a conversation, a sketch, or a number you can measure. If that step would not change your mind, it is not the right step.`;
}

function groq(kind: ReturnType<typeof branch>, ask: string) {
  if (kind === "web") {
    return `Here are five website ideas you could consider:

1. A niche resource hub — a focused site that curates useful resources, tools, or guides for a specific audience (freelancers, remote workers, or students).
2. A personal brand site — skills, portfolio, and the path that makes someone trust you.
3. A problem-solving tool — a simple web app for a real job, such as a productivity tracker, habit planner, or budget.
4. A local or scene guide you are actually qualified to write.
5. A public learning log so the site is evidence of the work.`;
  }
  if (kind === "gtm") {
    return `Short version: one niche, one channel, one proof.

- Talk to people who already have the problem.
- Give them the smallest paid version.
- Do not add a second channel until the first one repeats.`;
  }
  if (kind === "risk") {
    return `The risks that matter: nobody wants it, someone already solved it, you cannot deliver, or you run out of time before you learn.

Test demand before you test taste. “${clip(ask, 80)}” gets clearer once you know which of those four is the real one.`;
  }
  return `Short version of “${ask}”: decide the constraint, run the smallest test that could kill the idea, then keep only what survived.

- Constraint first.
- One test.
- No extra process until the test says yes.`;
}

function claude(kind: ReturnType<typeof branch>, ask: string) {
  if (kind === "gtm") {
    return `For a simple go-to-market strategy, here are a few key steps:

1. **Define your target audience** — focus on a specific niche to start, rather than trying to reach everyone.
2. **Validate the offer** — talk to people who already feel the problem and see if it is worth paying for.
3. **Pick one channel** — content, community, or direct outreach. Do not spread thin.
4. **Measure one number** — conversations that turn into a yes. Scale only after that repeats.`;
  }
  if (kind === "web") {
    return `Here are five website ideas for your website:

1. A curated directory of useful tools and resources for your niche.
2. A blog with in-depth guides, tutorials and real-world case studies.
3. A community platform where people can ask questions and share experiences.
4. A simple SaaS tool that solves a common problem (for example invoicing, project management, or habit tracking).
5. An online store for digital products (templates, ebooks, or courses).`;
  }
  if (kind === "risk") {
    return `Some of the biggest risks include:

1. **Market adoption** — is there real demand, or only polite interest?
2. **Competition** — what makes you different from the workaround they already have?
3. **Funding** — can you sustain the learning period before revenue?
4. **Execution** — can you deliver the product well enough that the first users stay?

I would rank them by “what ends the project”, not by what feels most dramatic.`;
  }
  if (kind === "idea") {
    return `I can help you understand the idea, and I want to be careful not to invent a business you did not describe.

1. **What you're really asking** — ${ask}
2. **What I would need** — who it is for, the painful moment, and what “good” looks like in a month.
3. **A frame in the meantime** — an idea is promising when a specific person already spends time or money on a worse version.
4. **Next** — paste the idea in a few sentences and I will mark what is sharp and what is still vague.`;
  }
  return `A careful take on this:

1. **What you're asking** — ${ask}
2. **What matters** — a clear person, a constraint you can name, and a next step that does not depend on a perfect plan.
3. **How I'd proceed** — write the answer you wish you had, then cut it until someone else could act on it.
4. **What I'd watch** — whether the next step teaches you something, or only keeps you busy.`;
}

function mistral(ask: string) {
  return `Three moves for “${ask}”:

1. State the outcome in one sentence.
2. List the two facts you are sure of, and the one assumption you are not.
3. Design a check that takes less than a day.

I would rather be precise about a small slice than general about the whole problem.`;
}

function dahl(ask: string) {
  return `Sit with the question for a moment: ${ask}

The interesting part is usually not the first answer. It is the constraint you have not said out loud — time, taste, money, or fear of picking the wrong people.

Name that constraint. Then the work gets smaller, and smaller is where it becomes real.`;
}

function cloudflare(ask: string) {
  return `Treat “${ask}” like something you have to ship, not something you have to admire.

- One user path.
- One failure you can see.
- One place the result is stored or shared.

If you cannot point at those three, it is still a description, not a plan.`;
}

function openrouter(ask: string) {
  return `Comparing approaches to “${ask}”:

- A fast, shallow pass will tell you if the question is even the right question.
- A slower, careful pass is worth it only after that.
- Mixing both at once usually produces a long answer and a weak decision.

Pick the pass that matches how soon you need to act.`;
}

function cohere(ask: string) {
  return `Recommendation for “${ask}”:

Write the decision, the owner, and the evidence you will accept. Share that with the people involved before you collect more opinions. Extra commentary without a decision just adds noise.`;
}

function deepseek(ask: string) {
  return `Break “${ask}” into inputs, a rule, and an output.

- Inputs: what you already have.
- Rule: the one transformation you are proposing.
- Output: what a correct result looks like, stated so it can be checked.

If the output cannot be checked, the plan is not finished.`;
}

function grok(ask: string) {
  return `Straight answer on “${ask}”: you probably already know the next step and are looking for permission to skip the theater.

Do the version a skeptical friend would respect. If it only works with a perfect launch, it does not work.`;
}

function kimi(ask: string) {
  return `On “${ask}”: keep the scope tight, name the person it is for, and stop when the next action is obvious. Depth can wait until that action has a result.`;
}

const VOICES: Record<string, (kind: ReturnType<typeof branch>, ask: string) => string> = {
  gemini,
  groq,
  claude,
  mistral: (_k, ask) => mistral(ask),
  dahl: (_k, ask) => dahl(ask),
  cloudflare: (_k, ask) => cloudflare(ask),
  openrouter: (_k, ask) => openrouter(ask),
  cohere: (_k, ask) => cohere(ask),
  deepseek: (_k, ask) => deepseek(ask),
  grok: (_k, ask) => grok(ask),
  kimi: (_k, ask) => kimi(ask),
};

export function composePreview(input: PreviewInput) {
  const ask = topic(input.prompt);
  const kind = branch(input.prompt);
  const voice = VOICES[input.modelId] ?? VOICES.gemini;
  const history =
    input.mode !== "balanced" && input.ownHistory.length
      ? `\n\nEarlier in this thread you asked: “${clip(input.ownHistory[input.ownHistory.length - 1], 120)}”. This follow-up stays with that thread.`
      : "";
  const lead = input.mode === "collaborative" ? peerNote(input.peers) : "";
  const moreSpecific =
    /more specific|with examples|examples/.test(input.prompt.toLowerCase()) && kind === "web"
      ? specificWeb(input.modelId)
      : "";
  return `${lead}${moreSpecific || voice(kind, ask)}${history}${fileNote(input.attachments)}`.trim();
}

function specificWeb(modelId: string) {
  if (modelId === "gemini") {
    return `Here are five more detailed website ideas with examples:

1. A resource hub for freelance illustrators — contract templates, invoice examples, and a weekly brief of studios that are hiring.
2. A personal site for a Lagos-based product designer — three case studies, each with the constraint, the decision, and the result.
3. A shared reading list for a study group, with a one-paragraph note on why each piece is there.
4. A tiny invoicing page for one-person shops that only does “send, remind, mark paid”.
5. A neighborhood food map written by one person, updated when a place is actually visited.`;
  }
  if (modelId === "claude") {
    return `Here are five more specific ideas with real-world examples:

1. A curated directory of tools for independent researchers, with a note on what each one is bad at.
2. A tutorial blog that only publishes walkthroughs you have done yourself, like “how I set up a simple store in a weekend”.
3. A community Q&A for first-time founders in one city, moderated so it does not become a pitch room.
4. A habit tracker that is just a weekly review, not a streak game.
5. A template shop for proposals and scopes, priced as a pack rather than a subscription.`;
  }
  if (modelId === "groq") {
    return `More specific versions:

1. Resource hub — “tools for solo consultants”, ten links, each with a one-line verdict.
2. Portfolio — three projects, no carousel.
3. Tool — a budget sheet that two roommates can share.
4. Guide — one city, one scene, written this month.
5. Log — what you learned this week, posted on Friday.`;
  }
  return "";
}

export function modelLabel(id: string) {
  return providerById(id)?.name ?? id;
}
