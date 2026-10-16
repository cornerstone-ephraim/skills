---
name: tech-spec
description: Write a tech spec plus step-by-step implementation plan for an incoming task, as a single HTML page grounded in the real code, then publish it. Part 1 is a short, glanceable spec scoped strictly to the ticket (overview, goals, data model, numbered plan with one marked-up code block per function, then small tables for testing, rollback, open questions, follow-ups, alternatives). Part 2 explains the task in plain words. Use when the user asks for a "tech spec", "spec", "design doc", "implementation plan", "RFC" or "plan for this ticket", or wants code steps to review before coding. Written for a tired reader: plain English, every claim tied to a line of code, anchor analogies.
---

# Tech spec

A single-file HTML page that gets a task from "ticket" to "ready to code and review". Part 1 is the spec a reviewer reads. Part 2 is the same plan in plain words for the person doing the work. Start from `template.html` in this folder. It uses the same look as the `explainer-html` skill.

If the `explainer-html` skill is available, follow its research rules, teaching rules and plain-English voice (sections 1–3). This skill only adds what's specific to specs. If it isn't available, the essentials are repeated below.

## 1. Research before writing

- Read the code the ticket touches, plus every caller of anything you plan to change. For broad tasks, fan out to subagents (one per area) and ask for file:line refs and short verbatim excerpts.
- Map the blast radius: every place that reads or writes the thing you're changing. Use it to decide scope; what the ticket does not ask for goes in Follow-ups.
- Verify each claim in the ticket against the code: confirmed / partly / not confirmed.
- Find existing helpers before proposing new ones, and name them in Dependencies with file:line.
- Note problems found along the way under Follow-ups, separate from the task's scope.
- Anything you can't confirm goes under Open questions as "check this before coding", with the file:line that raised the doubt. Never present a guess as fact.

## 2. Voice

Assume the reader is smart but tired.

- Short sentences, one idea each, "you". Say what code does before naming it.
- **Name every actor concretely.** Never write "the worker", "the consumer", "the job" or "the caller" on its own. The first time an actor appears in each section, say what it physically is: the process it runs in (for example a pm2 app name), the file and function, and what triggers it (queue name, cron schedule, route, webhook). When two actors clash, say they are separate programs that only share the database record.
- Introduce one or two anchor pictures in the overview and reuse them throughout (for example: a hotel card hold for a lien; two cashiers paying the same cheque for a race).
- **Point at the line for every claim.** Any sentence that says what code does ("the job asks for the whole balance", "the debit refuses") names the exact file:line, and quotes the key expression where it helps. This applies to the overview and refresher too, not only the code steps. Re-check line numbers just before publishing.
- Don't thread a recurring numeric example through the page. Describe behaviour in general terms ("balance minus lien", "the free amount") and point at the line of code instead.
- Reduce the plan to one sentence or formula and state it in the overview ("free = total − frozen"; "set it to X, but only if it's still Y").
- Re-explain terms briefly in each major section, so readers can jump straight to a step.
- No em-dash asides, no "not X but Y", no stock phrases.

## 3. Part 1 · Tech spec

**Scope: only what the ticket asks for.** Every step in the plan must serve a line in the ticket. Anything else you find (a related bug, a nicer API field, a UX fix, a "while we're here" cleanup) goes in Follow-ups or Open questions, never in the plan. If you're unsure whether something is in scope, put it in Follow-ups and say so in chat. A good spec here is short: the user's own example had four plan steps.

**Keep it simple.** Every section should read at a glance. Prefer a small table (one line per row, file:line in its own column) or two or three bullets over paragraphs. No timeline table, phases, estimates, `.when` tags, `.ctxline`, `.handoff` lines or scope-at-a-glance pill tables unless asked.

1. **Overview.** Two short paragraphs: what the feature does, and the gap in the code today with the file:line that causes it.
2. **Goals.** Bullets, straight from the ticket.
3. **Data model.** One line: the change, or "No change" plus the field that already exists (file:line). Add an **API changes** line only if consumers will notice something; flag anything breaking.
4. **Implementation plan.** Numbered steps (`<h4>1. …</h4>`), one per function you edit. Split a step if it edits two functions. Each step is:
   - one or two sentences: the function, what triggers it (process + cron/queue/route, file:line), and what changes;
   - **one** code block of the real surrounding code, with a `.codecap` of file:lines. Show enough context to see where the edit sits (the lines that load the value, the check, the use), trim unrelated lines to `// …`, and mark every changed or added line with `// new`. No separate Before/After blocks.
   - an optional one-line note, only for a real gotcha.
5. **Testing.** A table: what, check, fails today? Plus a one-line bug bash recipe.
6. **Monitoring and rollback.** Two bullets: what to watch, how to roll back.
7. **Open questions.** A table: question, where (file:line), who decides.
8. **Follow-ups.** A table: follow-up, where (file:line). Everything outside the ticket goes here.
9. **Alternatives considered.** A table: option, why not (one line each).

## 4. Part 2 · The task in plain words

9. **Two-minute refresher:** concept blocks (What / Everyday / Where / Why) for each idea the task needs.
10. **What the task wants, and why it matters:** a plain restatement, and who is hurt today.
11. **What you'll do, step by step:** per step, a heading with its files, an `.aside` with the plain why, a `.ctx` context box (below), then a `.fixes` line. Don't repeat Part 1's code; group steps that share context. Keep the step numbers in step with Part 1.
    **The context box** answers the questions readers actually ask about an edit: where a value comes from, what an object holds, who calls this code and who uses its result. Readers need that to understand a change rather than copy it. Build it from the code, citing file:line for every fact:
    - **How you get here:** the call chain from the real trigger (route, webhook, cron job, queue consumer, admin action) to the function you edit, plus one everyday sentence on what triggers it.
    - **What you already have:** the variables in scope that the change uses, what each holds, where it was read or built, and any surprises (read before several awaits; one partition rather than the whole wallet; a copy the caller may have changed). Add a 3–8 line real-code excerpt only if a line is confusing on its own.
    - **What happens next:** who receives the return value or reads what you wrote, and what they do with it today. Flag callers that ignore the result.
    - **Watch out for** (optional): real gotchas only, such as another caller of the same function or a shared helper other flows use.

    Writing "What happens next" means checking callers, and that often turns up gaps in the plan itself (for example, a caller that ignores a new `stale` result and still logs a retry). Fix the step and say so; don't bury it in the box. Skip the call chain when the edit is self-contained. Don't paste whole surrounding functions.
12. **How you'll know you're done:** a checklist of observable results.

## 5. Wrap-up

13. **Data stores and tools worth knowing:** only the niche commands and options this task uses (for example, `findOneAndUpdate` with a status filter, `bulkWrite`'s `matchedCount`, `$project` computed fields, `SET NX EX`).
14. **Senior engineer tips:** the practice, where it applies, the trade-off.
15. **Practice:** 4–6 questions grounded in this task's code.
16. **Glossary.**

## 6. Answering follow-up questions about the spec

- When the user asks what something in the spec means, answer from the code (file:line). Use the plain version first: the analogy, then the two or three facts that matter.
- If answering turns up something the spec gets wrong or leaves out, say so, and offer to fold it into both Part 1's plan and Part 2's step. If it's outside the ticket, it goes in Follow-ups.
- When asked to make the page plainer, follow the rewrite pass in `explainer-html` (back up first; rewrite prose only; keep facts, code, ids; list doubts instead of silently fixing them).

## 7. Save and publish

- Title: a 2–4 word name ("Wallet Lien Spec"). Put the one-sentence summary in `<meta name="description">`.
- The template has no `<!doctype>`/`<html>`/`<head>`/`<body>` wrapper, because artifact hosts add it. For a standalone file opened locally, add the wrapper.
- Save the file in the project's gitignored `docs/` if there is one. Otherwise ask, or use a scratch directory. If your tool can publish pages, publish there too, and re-publish to the same URL on every update.
- If the page was published before, compare the live version with your local file before overwriting it, so edits made elsewhere aren't lost.
- Record the path (and URL) wherever the project keeps notes, so later specs can link to it.
- In the reply: the link or path, then a few short lines on what matters most, especially breaking API changes and open questions that block coding.
