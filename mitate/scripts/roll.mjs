#!/usr/bin/env node
/**
 * roll: real entropy for range. I'm bad at being random; asked to "pick", I pick my favourites.
 * This rolls one constraint per dimension for each concept from deliberately wide pools.
 * Honour each roll, or reroll a dimension once with a written reason. Never pick instead of rolling.
 *
 * usage: node roll.mjs [--pool pages|components] [--n 6] [--json]
 */
import { randomInt } from "node:crypto";
import { parseArgs } from "node:util";

const PAGES = {
  medium: [
    "a drawn object or mechanism (flat)", "line drawing, one weight", "photography, art-directed (the user's own, licensed stock or generated: ask, then source it)",
    "type only: the words are the image", "the real product UI, honest, at scale and cropped", "a real chart or dataset as the hero",
    "collage or mixed media", "a 3D or rendered object", "a printed texture (risograph, letterpress, halftone, paper)",
    "an editorial layout (a magazine or newspaper grid)", "a short video or motion piece", "hand-made marks (ink, pencil, stamp, scribble)",
    "a physical object, photographed flat on a surface", "an interface the visitor uses on the spot (a working mini-tool)",
  ],
  composition: [
    "full-bleed visual with the text over it", "centred stack: headline, action, visual below", "text left, visual right", "text right, visual left",
    "text at the bottom of the screen, visual above", "the screen split between two grounds", "the visual as a band through the middle",
    "an asymmetric grid with one oversized cell", "one element cropped huge off the edge", "a long single column that starts the scroll inside the hero",
  ],
  ground: [
    "white", "black", "a brand colour, full-bleed", "a neutral that isn't white (stone, grey, bone)", "a photograph as the ground",
    "two colours, split", "a texture or material", "whatever the medium brings (no chosen ground)",
  ],
  type: [
    "a serif at display size", "a plain grotesk", "monospace, because the product's artifact is text", "condensed", "wide or extended",
    "rounded", "type at an enormous scale, as the image", "two faces in an editorial mix", "one face, one size, almost no hierarchy",
  ],
  motion: [
    "none: still and confident", "one entrance, then still", "an ambient loop", "driven by the pointer", "driven by the scroll", "live data or the time of day",
  ],
  colour: [
    "monochrome", "neutrals and one accent", "two colours only", "a full palette", "the colour of the photograph or material", "black and white",
  ],
  density: [
    "sparse, with one dense object", "dense from edge to edge", "a regular grid of many", "one enormous element and nothing else",
  ],
  // Original prompts for when a concept stalls. Not a copy of any published card deck.
  nudge: [
    "Use the least likely medium for this category.", "Remove the thing you think is essential.", "Make it look printed, not rendered.",
    "What would this have looked like in 1975?", "Let the copy be the image.", "Show the moment just after the product did its job.",
    "Make the user the subject, not the product.", "Use a real object instead of a drawing.", "Use one colour.",
    "Let one part be rough on purpose.", "Show the edges of the product, not its centre.", "Get one scale deliberately wrong.",
    "Make it quieter than feels safe.", "Show what this product replaces.", "Use the product's own words, verbatim.",
    "Show a mistake and its fix.", "Design it at a tenth of the size, then scale it up.", "Look at it from directly above.",
    "Let the visitor do the last step.", "Borrow the structure of a document from another field.",
  ],
};


// Components: the skin is locked by the design system, so the dice roll the interaction model.
const COMPONENTS = {
  home: [
    "inline, inside the content it controls", "in the margin beside the content", "an overlay summoned on demand",
    "a persistent panel that's always open", "a bar fixed to one edge", "embedded inside another component",
    "on the object itself, appearing on focus", "in the place the end user will see it",
  ],
  unit: [
    "one item at a time, at full size", "a list of rows", "a continuous document", "a grid or canvas",
    "plain text the user writes", "a tree with nesting", "a single summary that expands",
  ],
  input: [
    "pointer first", "keyboard first", "typed text or commands", "direct manipulation (drag, resize, draw)",
    "natural language", "one key or tap for the common case", "the same input the end user will use",
  ],
  disclosure: [
    "everything visible at once", "revealed on focus", "behind one trigger", "appears as you type",
    "collapses after use", "summary first, detail in place", "never hidden: the rare actions are removed",
  ],
  containment: [
    "no containers: type and space only", "rows with rules", "one shared surface", "cards (only if each item is an object)",
    "floating, anchored to what it edits", "a frame that mirrors the end user's view",
  ],
  density: [
    "compact and scannable", "comfortable", "spacious: one thing at a time", "dense with a single focus area",
  ],
  feedback: [
    "inline and instant", "a live preview beside it", "the data's weight shown (counts, ticks, proportions)",
    "a summary after the action", "ambient: nothing until something is wrong",
  ],
  motion: [
    "none", "the item moves to where it goes", "a panel follows focus", "content swaps in place",
    "a count or mark updates", "an insertion line during reorder",
  ],
  nudge: [
    "Remove the container.", "Make it work with no pointer.", "Show the data's weight, not just its name.",
    "Let the user type it instead of clicking it.", "What if it were always open?", "What if it didn't exist until needed?",
    "Make the end user's view the editing surface.", "Put the controls where the eye already is.", "Design the empty state first.",
    "Make it work at fifty items.", "Borrow the interaction from a tool in another field (IDE, spreadsheet, map, DAW).",
    "One keystroke for the common case.", "Use undo instead of confirmation.", "Make the structure visible.",
    "Halve the number of controls.", "Make it work on a phone first.", "Let the system guess, and make the guess easy to correct.",
  ],
};

const { values } = parseArgs({ options: { pool: { type: "string", default: "pages" }, n: { type: "string", default: "6" }, off: { type: "string", default: "0.125" }, json: { type: "boolean", default: false } } });
const POOLS = { pages: PAGES, components: COMPONENTS }[values.pool];
if (!POOLS) { console.error("unknown --pool; use pages or components"); process.exit(1); }
const n = Math.max(1, Math.min(24, parseInt(values.n, 10) || 6));
// The pools are a fixed vocabulary and become a median of their own. Now and then a dimension leaves the pool.
const off = Math.max(0, Math.min(1, Number(values.off) || 0));
const OFF = "OFF-POOL: invent a value that isn't on this list and isn't one of my defaults";
const roll = (k, pool) => (k !== "nudge" && randomInt(1_000_000) < off * 1_000_000 ? OFF : pool[randomInt(pool.length)]);
const rolls = Array.from({ length: n }, () => Object.fromEntries(Object.entries(POOLS).map(([k, pool]) => [k, roll(k, pool)])));

if (values.json) console.log(JSON.stringify(rolls, null, 2));
else rolls.forEach((r, i) => {
  console.log(`concept ${i + 1}`);
  for (const [k, v] of Object.entries(r)) console.log(`  ${k.padEnd(12)}${v}`);
});
