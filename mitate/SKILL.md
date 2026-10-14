---
name: mitate
description: Make variations that actually vary. When asked for variations, variants, versions, directions, alternatives or options of anything (a page, a hero, a component, a dashboard, a screen, a flow), produce ones that answer the underlying question differently, not reskins, shuffled layouts or density changes of the same idea. Uses real randomness (dice), generates many before filtering, tests that variants are far apart, and checks against my own repeated habits. Triggers on variations, variants, versions, directions, alternatives, options, "make 3 of these", "show me other ways", "what else could this be", "these all look the same", "make it less generic".
---

# Mitate (見立て)

The job: when asked for variations, make ones that are genuinely different, so that choosing between them is a real decision.

## 1. What fake variation looks like

The default, asked for "three variations", is one idea three times. Watch for:

- **Reskins:** a new font, accent, radius, shadow or ground on the same structure.
- **Shuffles:** text moved from left to right, sections reordered, a panel swapped to the other side.
- **Density changes:** the same thing compact, comfortable and spacious.
- **Neighbours:** three ideas from the same family (three kinds of card, three kinds of chart).
- **One bold, one safe, one in between:** a strength dial, not three ideas.

If a variant could be produced by changing CSS values on another variant, it isn't a variant.

## 2. What a real variation changes

Every thing being designed answers a question. Real variations answer it **differently**. Name the question first:

| Kind of thing | The question variants should answer differently | What can turn |
|---|---|---|
| A page or hero | What is this page fundamentally about, and what carries it? | The concept, the medium (photography, type, the real UI, data, a drawn object, a working tool), composition, ground |
| A component or pattern | How does the user do the job? | Where it lives, the unit it works on, how input arrives, what's visible before it's asked for, containment |
| A dashboard or screen | Which question does it answer first, and for whom? | What leads (overview, a forecast, a to-do list, one person's view), the unit (time, teams, items), what's demoted |
| Anything else | Write the question in one sentence | Whatever the question touches |

Layout, colour and type follow from the answer. They are never the variation on their own.

## 3. Say less

Over-explaining is my strongest habit, and it shows up in everything I make: pages, components, figures, and my own replies. A design that needs commentary to be understood isn't finished. A design that is understood doesn't need it.

- **Cut meta-text.** Eyebrows and kickers, tallies ("3 yours · 1 held"), status sentences ("1 change waiting for the next sync"), "last updated by…", intro paragraphs explaining how the screen works, helper text under every field, legends and keys.
- **Show the state; don't narrate it.** A blacked-out term already says "hidden". A dimmed control already says "locked". A sentence that says it again weakens it.
- **What a screen withholds is part of its design.** Telling people less is often more convincing, calmer and more confident. A contract from a stone-cold company makes the case, but the rule applies to every brand and every screen, not just cold ones.
- **The delete test.** Remove the line. If the user can still understand the screen and act correctly, it stays removed. Add back only what a real decision needs, at the point of that decision, in as few words as possible.
- **A roll never licenses commentary.** "Show the data's weight" means the data carries it (a length, a mark, a position), not a count or a sentence added beside it.

## 4. Process

### 0. Size it
- **Full run** for pages, new directions, whole screens or anything going in front of stakeholders: everything below.
- **Light run** for one small component or a quick "other ways to do this": roll `--n 6`, write six concepts, skip the blind generators, keep every filter test and the blind critic, build three. Never skip the roll or the cost test: those are what make it mitate rather than a reskin.

### 1. Read what was given, and what "this" means
- **What's locked?** A brand, a design system, real content, a screenshot. A locked system means variations come from the model, not the skin.
- **"Variations of this" is ambiguous.** It can mean "keep this and vary it" (it's a baseline) or "give me other takes on this kind of thing" (it's only the subject). If the request doesn't make it clear, ask once. Guessing wrong wastes the whole set.
- **Name the question** (section 2) in one sentence.

### 2. Name the defaults
Write down what you'd normally produce: the median answer for this kind of thing. Also write down your own house style, which is a default too:
- Pages: cream or paper grounds, serif display (often italic), clay or terracotta accents, tracked uppercase labels, nostalgic objects (dials, receipts, split-flap boards).
- Components: a ⌘K palette for anything keyboard, an inspector on the right for anything configurable, a chat thread with reply chips, "the app suggests, you confirm", text-led ideas, serif italic accents inside UI (display italic belongs to heroes and headlines, never to rows, labels or data).
- Everywhere: meta-text (see section 3), and keeping the baseline's form while rearranging it (a list re-sorted, plotted or stacked is still the list).

Keep a default only on purpose, with a reason.

### 3. Roll
`node <skill>/scripts/roll.mjs --pool pages --n 12` for pages and visual work, or `--pool components --n 12` for components, patterns, screens and dashboards. Each concept gets a constraint per dimension plus a nudge. Honour the roll, or reroll one dimension once with a one-line reason. Never choose instead of rolling: chosen values drift to favourites.

The pools are a fixed vocabulary, so over time they become a median of their own. Two guards:
- **Off-pool rolls.** About one dimension in eight comes back `OFF-POOL`. Invent a value that isn't on that dimension's list and isn't one of my defaults, and write it down. If it's good, tell the user it could join the pool.
- **Worn values.** Before honouring a roll, check `references/history.md`: a value that appears in most of the last three sets counts as a default, so reroll it once.

### 4. Generate many, then filter
- Write 10–12 "What if…" concepts before judging any. The first few are usually the median; the useful ones arrive late.
- Where subagents are available, generate blind in parallel: three to five agents, each given only the brief, what's locked and two or three rolls, nothing else. Independent samples spread further than one chain of thought.
- Prompts for when it stalls: take each key word of the brief and ask what world it implies; list the subject's real artefacts and ask which could lead; remove something you think is essential; invert the problem; push one quality to the extreme; borrow from another field.

### 5. Filter for distance
- **Same-sentence test.** Describe each variant's answer to the question in one sentence. If two share a sentence, merge them. Phrase it as the question: "How does the user rename a section?", "What does this page lead with?"
- **Anchor test.** Every variant must still be true to the subject. A stretch that says nothing about it is a gimmick.
- **Soul check.** Every variant must still carry the subject's own world: its places, people, materials, colour and warmth, and its real imagery where it has some. A roll may change the medium, but it may not strip the world out. Type on flat colour, or a monochrome drawing, that could belong to any product in the category has lost its soul, however distinct it is. When a roll pushes toward abstraction, bring the world back in through that medium (the real scene behind the type, the real people in the drawing).
- **Swap test.** Would it work unchanged for a competitor or a generic kit? Then it's not specific enough.
- **Cost test.** Each variant states what it gives up. A variant with no cost hasn't been thought through, and three variants with the same cost are one variant.
- **Spread.** The surviving set differs on at least three of the dimensions in section 2.
- **Equal effort.** No straw men. Each variant is built as if it were the one being chosen.

### 6. Blind critic
I generated the set, so I'm a weak judge of how far apart it is. Where subagents are available, give a fresh one only the question, each survivor's one-sentence answer and its cost (after building, the `look-variants.png` sheet too). Don't give it my reasoning or the rolls. Ask it three things:
1. Which two are the same idea underneath?
2. What do all of them share (a home, a unit, an input, a ground, a motif)?
3. Which one is the answer anyone would give first?
Reroll whatever it names, unless I can answer its point in one sentence. If no subagent is available, run the three questions myself on the sentences alone, with the reasoning out of view.

### 7. Check against my own history
Open `references/history.md` and compare the new set with the last few sets. If the set repeats a *kind* of answer I keep reaching for (the same medium, the same model, the same text-led or system-suggests idea), reroll those concepts. Repeating myself across briefs is house style too.

The history only works if it's kept. If the newest entry is more than two weeks old, or there are fewer than three sets for this pool, say in one line that the history check is weak this time.

### 8. Present, then build
Present the concepts as a numbered list. For each: **What if…**, one sentence describing it, which dimensions it turns, and what it gives up. Say which were cut and why, in a line. Section 3 applies to the presentation too: no walkthrough of every feature, no restating what the design shows. Then build the requested number. Render each one and look at it before showing; a variation that renders wrong reads as a weak idea.

End by asking once whether to record the set in `references/history.md`. Don't record it without a yes.

## 5. Redoing a variant
Re-roll everything except what the user explicitly said they liked. List what's carried over before building; anything on that list the user didn't ask to keep gets re-rolled, including secondary elements (chips, toolbars, captions). Don't reuse a sibling variant's choices.

## 6. Going deep on one
Once the user has picked a direction, variance moves inside it. Don't reopen the concept. Vary how it's carried out, along axes that belong to the chosen idea: its unit, the moment it appears, its hardest edge case (fifty items, none, an error), how it moves, and what it leaves out. The same tests apply at this scale. Two executions that share a sentence are one, and each states its cost. A colour or spacing pass is still not a variation.

## 7. Reading feedback
Translate each reaction into the property behind it: which variant, and which part (its idea, its model, its colour, one element). "I like A's idea and C's colours" is two properties, not two favourites. Carry the liked properties into the next set and name them before building. Never turn a liked variant's form into a rule: that collapses every future set into one style.

**Never write to this skill's files (`references/history.md`, `references/taste-ledger.md` or anything else) unless the user explicitly asks.** Read them; don't record into them on your own. Asking once at the end of a set (section 4, step 8) is how they stay current.

## 8. Before showing a set
- [ ] Each variant answers the question differently, in one sentence each.
- [ ] Each variant passes the soul check: the subject's own world is still in it.
- [ ] No variant is another one with new colours, fonts, spacing or a mirrored layout.
- [ ] The set differs on at least three dimensions.
- [ ] Each variant states its cost.
- [ ] None of them is my house style passed off as an idea.
- [ ] Nothing explains what the design already shows: every eyebrow, count, status line and helper sentence has passed the delete test.
- [ ] The set doesn't repeat the kinds of answer from my recent sets.
- [ ] A blind critic (or I, without my reasoning) found no shared idea, shared trait or obvious first answer that I couldn't defend.
- [ ] Any off-pool roll was honoured with an invented value, not swapped for a pool favourite.
- [ ] Locked things (brand, system, content) are respected, or the change is named.
- [ ] Each one has been rendered and looked at.

## Files
- `scripts/roll.mjs --pool pages|components --n 12 [--off 0.125]`: the dice. `--off` sets how often a dimension comes back off-pool (0 turns it off).
- `scripts/look.mjs <page> [more…] [--component]`: renders each variant and puts them side by side (`look-variants.png`), so anything every variant shares is easy to spot. Pages it hasn't rendered aren't ready to show.
- `references/history.md`: what past sets were made of. Read before showing a set.
- `references/taste-ledger.md`: the user's recorded reactions. Read as a filter after generating, never before.
