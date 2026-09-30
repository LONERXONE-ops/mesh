import type { Conversation, ModelResponse, Turn } from "./types";

const T = (h: number, m: number, day = 30) => Date.UTC(2026, 8, day, h, m);

function done(id: string, modelId: string, content: string): ModelResponse {
  return { id, modelId, status: "completed", content };
}

function failed(
  id: string,
  modelId: string,
  errorKind: ModelResponse["errorKind"],
  error: string,
): ModelResponse {
  return { id, modelId, status: "error", content: "", errorKind, error };
}

function turn(
  id: string,
  content: string,
  at: number,
  timeLabel: string,
  responses: ModelResponse[],
): Turn {
  return { id, content, attachments: [], createdAt: at, timeLabel, responses };
}

const models = ["gemini", "groq", "claude"];

export function seedConversations(): Conversation[] {
  const business: Conversation = {
    id: "c-business",
    title: "Business idea analysis",
    createdAt: T(10, 24),
    updatedAt: T(10, 32),
    mode: "balanced",
    modelIds: models,
    saved: false,
    turns: [
      turn("t-b1", "Help me understand this business idea.", T(10, 24), "10:24 AM", [
        done(
          "r-b1-g",
          "gemini",
          "A useful way to understand a business idea is to name four things in one sitting:\n\n1. Who feels the problem this week, not “everyone”.\n2. What they do now when it shows up.\n3. What you would charge, and why that is cheaper than the workaround.\n4. The smallest version that would earn a yes.\n\nYou have not described the idea itself yet — paste it and I can pressure-test those four against the actual offer.",
        ),
        failed("r-b1-q", "groq", "unavailable", "Groq is currently unavailable."),
        done(
          "r-b1-c",
          "claude",
          "I can help you understand the idea, and I want to be careful not to invent a business you did not describe.\n\n1. **What you're really asking** — Help me understand this business idea.\n2. **What I would need** — who it is for, the painful moment, and what “good” looks like in a month.\n3. **A frame in the meantime** — an idea is promising when a specific person already spends time or money on a worse version.\n4. **Next** — paste the idea in a few sentences and I will mark what is sharp and what is still vague.",
        ),
      ]),
      turn(
        "t-b2",
        "Can you also suggest a simple go-to-market strategy for this idea?",
        T(10, 32),
        "10:32 AM",
        [
          done(
            "r-b2-g",
            "gemini",
            "A simple go-to-market strategy for this type of business idea could focus on a lean, targeted approach. Start with a niche audience, validate the product with early adopters, and iterate based on feedback. Use content marketing and community building to create awareness, then scale with paid acquisition once you've proven product-market fit.",
          ),
          failed("r-b2-q", "groq", "unavailable", "Groq is currently unavailable."),
          done(
            "r-b2-c",
            "claude",
            "For a simple go-to-market strategy, here are a few key steps:\n\n1. **Define your target audience** — focus on a specific niche to start, rather than trying to reach everyone.\n2. **Validate the offer** — talk to people who already feel the problem and see if it is worth paying for.\n3. **Pick one channel** — content, community, or direct outreach. Do not spread thin.\n4. **Measure one number** — conversations that turn into a yes. Scale only after that repeats.",
          ),
        ],
      ),
    ],
  };

  const website: Conversation = {
    id: "c-website",
    title: "Website ideas",
    createdAt: T(10, 24),
    updatedAt: T(10, 28),
    mode: "independent",
    modelIds: models,
    saved: true,
    turns: [
      turn("t-w1", "Give me five ideas for my website.", T(10, 24), "10:24 AM", [
        done(
          "r-w1-g",
          "gemini",
          "Here are five website ideas you could consider:\n\n1. A niche resource hub for a specific audience, with a clear reason to return each week.\n2. A personal brand site that shows work, not slogans — three projects, the outcome, and who it was for.\n3. A small tool that removes one annoying task (invoice reminder, habit check, or a shared budget).\n4. A directory of trusted picks in one narrow field, written in your own voice.\n5. A learning journal that publishes the work as you learn it, so the site is proof, not a pitch.",
        ),
        done(
          "r-w1-q",
          "groq",
          "Here are five website ideas you could consider:\n\n1. A niche resource hub — a focused site that curates useful resources, tools, or guides for a specific audience (freelancers, remote workers, or students).\n2. A personal brand site — skills, portfolio, and the path that makes someone trust you.\n3. A problem-solving tool — a simple web app for a real job, such as a productivity tracker, habit planner, or budget.\n4. A local or scene guide you are actually qualified to write.\n5. A public learning log so the site is evidence of the work.",
        ),
        done(
          "r-w1-c",
          "claude",
          "Here are five website ideas for your website:\n\n1. A curated directory of useful tools and resources for your niche.\n2. A blog with in-depth guides, tutorials and real-world case studies.\n3. A community platform where people can ask questions and share experiences.\n4. A simple SaaS tool that solves a common problem (for example invoicing, project management, or habit tracking).\n5. An online store for digital products (templates, ebooks, or courses).",
        ),
      ]),
      turn("t-w2", "Can you make the ideas more specific with examples?", T(10, 27), "10:27 AM", [
        done(
          "r-w2-g",
          "gemini",
          "Here are five more detailed website ideas with examples:\n\n1. A resource hub for freelance illustrators — contract templates, invoice examples, and a weekly brief of studios that are hiring.\n2. A personal site for a product designer — three case studies, each with the constraint, the decision, and the result.\n3. A shared reading list for a study group, with a one-paragraph note on why each piece is there.\n4. A tiny invoicing page for one-person shops that only does “send, remind, mark paid”.\n5. A neighborhood food map written by one person, updated when a place is actually visited.",
        ),
        failed("r-w2-q", "groq", "failed", "Groq couldn't respond."),
        done(
          "r-w2-c",
          "claude",
          "Here are five more specific ideas with real-world examples:\n\n1. A curated directory of tools for independent researchers, with a note on what each one is bad at.\n2. A tutorial blog that only publishes walkthroughs you have done yourself.\n3. A community Q&A for first-time founders in one city, moderated so it does not become a pitch room.\n4. A habit tracker that is just a weekly review, not a streak game.\n5. A template shop for proposals and scopes, priced as a pack rather than a subscription.",
        ),
      ]),
    ],
  };

  const short = (
    id: string,
    title: string,
    prompt: string,
    at: number,
    label: string,
    geminiText: string,
    groqText: string,
    claudeText: string,
    saved = false,
  ): Conversation => ({
    id,
    title,
    createdAt: at,
    updatedAt: at,
    mode: "balanced",
    modelIds: models,
    saved,
    turns: [
      turn(`${id}-t`, prompt, at, label, [
        done(`${id}-g`, "gemini", geminiText),
        done(`${id}-q`, "groq", groqText),
        done(`${id}-c`, "claude", claudeText),
      ]),
    ],
  });

  return [
    business,
    website,
    short(
      "c-marketing",
      "Marketing strategy",
      "Draft a simple marketing strategy for a new product.",
      T(8, 12),
      "8:12 AM",
      "Start with one audience and one promise. Publish proof every week — a short demo, a customer sentence, a before and after. Paid spend comes after you can point to a channel that already works without it.",
      "One audience. One promise. One weekly proof. Ignore the rest until that repeats.",
      "1. **Audience** — the person who already feels the problem.\n2. **Promise** — the outcome in their words.\n3. **Proof** — something they can see, not a slogan.\n4. **Rhythm** — a weekly cadence you can keep.",
    ),
    short(
      "c-roadmap",
      "Product roadmap",
      "Help me sketch a product roadmap for the next quarter.",
      T(16, 4, 29),
      "4:04 PM",
      "Now: one job done well. Next: the reason to come back. Later: only what the first loop proved. A quarter is three bets, not a backlog.",
      "Three bets. Ship the first before you design the third.",
      "1. **This month** — the core job, for one kind of user.\n2. **Next** — retention, not more surface area.\n3. **If it worked** — the expansion those users already asked for.",
      true,
    ),
    short(
      "c-research",
      "User research",
      "How should I run user research before building?",
      T(11, 20, 29),
      "11:20 AM",
      "Talk to five people who hit the problem recently. Ask what they did, not what they want. The workaround is the finding.",
      "Five conversations. Last time it happened. What they did. Stop when the same workaround shows up twice.",
      "Recruit people who already tried to solve it. Interview the last episode, not a hypothetical future. Write the workaround in their words before you write a feature.",
    ),
    short(
      "c-compete",
      "Competitive analysis",
      "How do I look at competitors without copying them?",
      T(9, 5, 28),
      "9:05 AM",
      "Study the substitute, including the spreadsheet. Note where it is good enough. Your opening is the gap people already tolerate.",
      "Competitors are clues, not a checklist. Copy the job, not the interface.",
      "List what people use today. Mark what is good enough and what they complain about after they have already paid or spent time. Build against the complaint, not against their homepage.",
    ),
  ];
}
