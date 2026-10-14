#!/usr/bin/env node
/**
 * The look for a page, in one command, run from anywhere:
 *
 *   node <skill folder>/scripts/look.mjs <page.html | url> [more pages…] [--hover <selector>] [--wait <ms>] [--out <dir>] [--component]
 *
 * For each page it takes the shots below at once, in one browser, and writes
 * them, labelled, on one sheet: <name>-look.png. It also writes the full page
 * at desktop and phone width (<name>-page.png, <name>-phone-page.png) for the
 * sections below the hero. Given more than one page (range variants), it also
 * writes look-variants.png: every variant side by side, so what repeats across
 * the set is visible.
 *
 *   desktop   1440 × 900, light
 *   dark      1440 × 900, prefers-color-scheme: dark
 *   first     the first frame, at DOMContentLoaded: before fonts, load and entrance animations
 *   reduced   prefers-reduced-motion: reduce
 *   no-js     JavaScript off: what a reveal or a hydration gate hides
 *   hover     the desktop with the pointer on --hover's first match (only with --hover)
 *   phone     390 × 844, touch
 *   thumb     the desktop shot at 240px wide, the squint and 240px test
 *   card      the og:image, as a link preview shows it (only when the page has one)
 *
 * Then it prints what can be measured, one line each:
 *
 *   console   fail on any console error or warning, or page error, in any shot
 *   overflow  fail when the phone page scrolls sideways; names what sticks out
 *   targets   warn on controls under 44px at phone width (inline text links excepted)
 *   contrast  warn on text under 4.5:1 (3:1 at 24px, or 18.66px bold) against its
 *             nearest solid background, light and dark. An estimate: text over an
 *             image or a gradient is skipped, so confirm on the sheet
 *   alt       warn on <img> with no alt attribute
 *   motion    warn on animations still running forever, or videos playing, under reduced motion
 *   share     warn on a missing title, description, og:image, og:title, favicon, apple-touch-icon, theme-color
 *   weight    the bytes the page loads, and its JavaScript, against a landing-page budget
 *   lcp/cls   largest contentful paint and layout shift, measured locally without throttling
 *
 * It exits 1 when a page fails to load or console or overflow fails, 2 when it
 * cannot run, and 0 otherwise. Everything else is for eyes, on the sheet.
 *
 * The browser is Playwright's. playwright-core is installed once into a cache
 * folder of the user's (DESIGN_LOOK_CACHE moves it), never into the skill or
 * the working directory. It drives the installed Chrome, else Playwright's own
 * Chromium, else another Chromium browser it finds (Edge, Brave, Arc…).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const USAGE = "usage: node look.mjs <page.html | url> [more pages…] [--hover <selector>] [--wait <ms>] [--out <dir>] [--component]";
const DESKTOP = { width: 1440, height: 900 }, PHONE = { width: 390, height: 844 };
/** A landing page's budget: local numbers, so they flag, they don't certify. */
const BUDGET = { lcp: 2500, cls: 0.1, js: 300 * 1024, total: 2 * 1024 * 1024 };
const TARGET = 44, TALLEST = 15000;

/** The folder playwright-core is installed into: the user's cache folder, or DESIGN_LOOK_CACHE. */
export function cacheDir(env = process.env, platform = process.platform, home = homedir()) {
  if (env.DESIGN_LOOK_CACHE) return resolve(env.DESIGN_LOOK_CACHE);
  if (platform === "darwin") return join(home, "Library", "Caches", "design-look");
  if (platform === "win32") return join(env.LOCALAPPDATA || join(home, "AppData", "Local"), "design-look");
  return join(env.XDG_CACHE_HOME || join(home, ".cache"), "design-look");
}

/** playwright-core from the cache, installed there first when it is not. Throws with a reason when it cannot be had. */
function playwright(dir) {
  const req = createRequire(join(dir, "look.cjs"));
  const has = () => { try { return req.resolve("playwright-core/package.json"); } catch { return null; } };
  if (!has()) {
    console.log(`installing playwright-core once, into ${dir}`);
    mkdirSync(dir, { recursive: true });
    try { writeFileSync(join(dir, "package.json"), '{ "private": true }\n', { flag: "wx" }); } catch { /* already there */ }
    const win = process.platform === "win32";
    const run = spawnSync(win ? "npm.cmd" : "npm", ["install", "playwright-core@1", "--prefix", dir, "--no-audit", "--no-fund", "--loglevel=error"], { encoding: "utf8", shell: win });
    const why = run.error?.code === "ENOENT" ? "npm is not on the PATH" : run.error?.message ?? /Error: (.*)$/m.exec(run.stderr)?.[1] ?? run.stderr.trim().split("\n")[0];
    if (run.status !== 0 || !has()) throw new Error(why || "npm failed");
  }
  return { chromium: req("playwright-core").chromium, cli: join(dirname(has()), "cli.js") };
}

/** A page given on the command line: its address and a short name for the files. */
export function target(s, taken = new Set()) {
  let url, name;
  if (/^(https?|file):/i.test(s)) {
    url = s;
    const u = new URL(s);
    name = (u.protocol === "file:" ? basename(u.pathname, extname(u.pathname)) : `${u.hostname}${u.pathname}`).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "page";
  } else {
    const file = resolve(s);
    if (!existsSync(file)) return null;
    url = pathToFileURL(file).href;
    name = basename(file, extname(file));
    if (name === "index") name = basename(dirname(file)) || name;
  }
  for (let base = name, i = 2; taken.has(name); i++) name = `${base}-${i}`;
  taken.add(name);
  return { url, name };
}

/* Runs before the page's own scripts: keeps the largest contentful paint and the layout shift. */
const INIT = () => {
  const look = (window.__look = { lcp: null, cls: 0 });
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) look.lcp = { t: e.startTime, el: e.element }; }).observe({ type: "largest-contentful-paint", buffered: true }); } catch { /* not supported */ }
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) look.cls += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch { /* not supported */ }
};

/* Shared by the checks below, injected into the page as a string. */
const DESCRIBE = `(el) => {
  if (!el || !el.tagName) return "?";
  const t = el.tagName.toLowerCase(), id = el.id ? "#" + el.id : "";
  const cls = !id && typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\\s+/)[0] : "";
  const text = (el.getAttribute("aria-label") || el.innerText || el.value || el.alt || "").trim().replace(/\\s+/g, " ").slice(0, 28);
  return t + id + cls + (text ? ' "' + text + '"' : "");
}`;

/** The phone page: what sticks out sideways, and the controls that are too small. */
const PHONE_CHECKS = `(() => {
  const describe = ${DESCRIBE}, W = document.documentElement.clientWidth, sw = document.scrollingElement.scrollWidth;
  const clips = (el) => { for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) if (getComputedStyle(p).overflowX !== "visible") return true; return false; };
  const shown = (el, r) => r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
  const out = [...document.body.querySelectorAll("*")].filter((el) => { const r = el.getBoundingClientRect(); return shown(el, r) && (r.right > W + 1 || r.left < -1) && !clips(el); });
  const outer = out.filter((el) => !out.includes(el.parentElement)).slice(0, 3).map((el) => { const r = el.getBoundingClientRect(); return describe(el) + " (" + Math.round(r.left) + " to " + Math.round(r.right) + ")"; });
  const sel = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=checkbox],[role=switch],[tabindex]:not([tabindex="-1"])';
  const inline = (el) => getComputedStyle(el).display === "inline" && el.parentElement && el.closest("p,li,dd,td,figcaption,blockquote") && el.parentElement.innerText.length > el.innerText.length + 20;
  const small = [...document.querySelectorAll(sel)].filter((el) => { const r = el.getBoundingClientRect(); return shown(el, r) && !inline(el) && (r.width < ${TARGET} || r.height < ${TARGET}); })
    .map((el) => { const r = el.getBoundingClientRect(); return describe(el) + " " + Math.round(r.width) + "×" + Math.round(r.height); });
  return { W, sw, outer, small };
})()`;

/** Text against its nearest solid background, measured by painting both colours into a pixel. */
const CONTRAST = `(() => {
  const describe = ${DESCRIBE}, c = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgba = (s) => { c.clearRect(0, 0, 1, 1); c.fillStyle = "#000"; c.fillStyle = s; c.fillRect(0, 0, 1, 1); const d = c.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (f, b) => f.map((v, i) => (i < 3 ? v * f[3] + b[i] * (1 - f[3]) : 1));
  const lum = (p) => { const [r, g, b] = p.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const ground = (el) => { // the nearest solid background, or null when an image or gradient is in the way
    const layers = [];
    for (let p = el; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.backgroundImage !== "none") return null;
      const b = rgba(cs.backgroundColor);
      if (b[3] > 0) { layers.push(b); if (b[3] >= 1) break; }
    }
    return layers.reverse().reduce((acc, l) => over(l, acc), [255, 255, 255, 1]);
  };
  const low = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() ? 1 : 2) });
  const seen = new Set();
  for (let n; (n = walk.nextNode());) {
    const el = n.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || cs.visibility === "hidden" || +cs.opacity === 0 || el.closest("script,style,noscript,[aria-hidden=true]")) continue;
    const bg = ground(el);
    if (!bg) continue;
    const fg = over(rgba(cs.color), bg), size = parseFloat(cs.fontSize), large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
    const x = ratio(fg, bg), need = large ? 3 : 4.5;
    if (x < need) low.push(describe(el) + " " + x.toFixed(2) + ":1 (needs " + need + ")");
  }
  return low;
})()`;

/** Under reduced motion: what still moves. */
const MOTION = `(() => {
  const forever = document.getAnimations().filter((a) => a.playState === "running" && a.effect && a.effect.getComputedTiming().endTime === Infinity).length;
  const videos = [...document.querySelectorAll("video")].filter((v) => !v.paused).length;
  return { forever, videos };
})()`;

/** The tags a link preview, a tab and a phone's browser chrome read, the images without alt, and what the page loaded. */
const DESKTOP_CHECKS = `(() => {
  const describe = ${DESCRIBE}, q = (s) => document.querySelector(s), abs = (v) => { try { return v ? new URL(v, document.baseURI).href : ""; } catch { return ""; } };
  const meta = {
    title: document.title.trim(),
    description: q('meta[name="description"]')?.content || "",
    "og:image": abs(q('meta[property="og:image"]')?.content),
    "og:title": q('meta[property="og:title"]')?.content || "",
    favicon: abs(q('link[rel~="icon"]')?.getAttribute("href")),
    "apple-touch-icon": abs(q('link[rel="apple-touch-icon"]')?.getAttribute("href")),
    "theme-color": q('meta[name="theme-color"]')?.content || "",
  };
  const noAlt = [...document.images].filter((i) => !i.hasAttribute("alt")).map(describe);
  const nav = performance.getEntriesByType("navigation")[0];
  const inlineJs = [...document.querySelectorAll("script:not([src])")].reduce((n, s) => n + s.textContent.length, 0);
  const files = [nav, ...performance.getEntriesByType("resource")].filter(Boolean).map((e) => ({ name: e.name, size: e.encodedBodySize || e.transferSize || 0, js: e.initiatorType === "script" || /\\.m?js(\\?|$)/.test(e.name) }));
  const l = window.__look || {};
  return { meta, noAlt, files, inlineJs, lcp: l.lcp ? { t: l.lcp.t, el: describe(l.lcp.el) } : null, cls: l.cls ?? null };
})()`;

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const kb = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.round(n / 1024)}KB`);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const b64 = (buf) => buf.toString("base64");

/** Opens a page in its own context and collects what it says on the console. */
async function open(browser, url, options, { early = false, wait = 1500 } = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage(), bad = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") bad.push(`console ${m.type()}: ${m.text().slice(0, 160)}`); });
  page.on("pageerror", (e) => bad.push(`page error: ${e.message.slice(0, 160)}`));
  await page.addInitScript(INIT);
  try {
    await page.goto(url, { waitUntil: early ? "domcontentloaded" : "load", timeout: 30000 });
  } catch (e) {
    bad.push(`did not load: ${e.message.split("\n")[0]}`);
    return { context, page, bad, failed: true };
  }
  if (!early) {
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    await sleep(wait);
  }
  return { context, page, bad };
}

/** Scrolls the whole page once, so lazy images and scroll reveals arrive, then captures it top to bottom. */
async function fullPage(page, path) {
  await page.evaluate(async () => {
    const step = innerHeight * 0.8;
    for (let y = 0; y < document.scrollingElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    scrollTo(0, 0);
  });
  await sleep(400);
  const { w, h } = await page.evaluate(() => ({ w: document.documentElement.clientWidth, h: document.scrollingElement.scrollHeight }));
  await page.screenshot({ path, fullPage: true, ...(h > TALLEST ? { clip: { x: 0, y: 0, width: w, height: TALLEST } } : {}) });
  return h > TALLEST ? `${path} (first ${TALLEST}px of ${h})` : path;
}

/** The og:image's bytes, from disk or the network, for the sheet. */
async function card(context, url) {
  try {
    if (url.startsWith("file:")) return { data: readFileSync(fileURLToPath(url)), type: extname(url).slice(1).replace("jpg", "jpeg").replace("svg", "svg+xml") || "png" };
    const res = await context.request.get(url);
    if (!res.ok()) return null;
    return { data: await res.body(), type: (res.headers()["content-type"] || "image/png").replace(/^image\//, "").split(";")[0] };
  } catch { return null; }
}

/** Chromium browsers Playwright can drive, besides Chrome: the first one installed is used. */
const OTHERS = {
  darwin: ["Microsoft Edge", "Brave Browser", "Arc", "Chromium", "Vivaldi", "Dia", "Comet"].map((a) => `/Applications/${a}.app/Contents/MacOS/${a}`),
  win32: [join(process.env["ProgramFiles(x86)"] || "", "Microsoft/Edge/Application/msedge.exe"), join(process.env.ProgramFiles || "", "BraveSoftware/Brave-Browser/Application/brave.exe")],
  linux: ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge", "/usr/bin/brave-browser"],
};

/** Chrome, then Playwright's own Chromium, then any other Chromium browser on the machine; null when there is none. */
export async function launch(chromium) {
  const tries = [{ channel: "chrome" }, {}, ...(OTHERS[process.platform] || []).filter((p) => p && existsSync(p)).map((executablePath) => ({ executablePath }))];
  for (const options of tries) { try { return await chromium.launch(options); } catch { /* the next one */ } }
  return null;
}

/** One page's sheet. */
function sheet(name, url, shots, cardImg) {
  const img = (s, cls) => s ? `<figure class="${cls}"><figcaption>${esc(s.label)}</figcaption><img src="data:image/png;base64,${s.png}"></figure>` : "";
  const thumb = shots.desktop && { ...shots.desktop, label: "thumb  240px: name each part, find where the eye starts" };
  const share = cardImg && `<figure class="card"><figcaption>card  og:image, as a link preview (600 wide)</figcaption><img src="data:image/${cardImg.type};base64,${b64(cardImg.data)}"></figure>`;
  return `<!doctype html><meta charset="utf-8"><style>
  body { margin: 0; padding: 16px; width: 1800px; box-sizing: border-box; background: #ececef; color: #18181b; font: 13px/1.3 ui-monospace, Menlo, Consolas, monospace; }
  h1 { font: inherit; margin: 0 0 10px; color: #55555c; overflow-wrap: anywhere; }
  .row { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
  figure { margin: 0; flex: 1 1 0; min-width: 0; }
  figure.phone { flex: 0 0 390px; } figure.thumb { flex: 0 0 240px; } figure.card { flex: 0 0 600px; }
  figcaption { margin: 0 0 6px; overflow-wrap: anywhere; }
  img { display: block; width: 100%; outline: 1px solid #c9c9ce; }
</style><h1>${esc(name)} · the look · ${esc(url)}</h1>
<div class="row">${img(shots.desktop)}${img(shots.dark)}</div>
<div class="row">${img(shots.first)}${img(shots.reduced)}${img(shots["no-js"])}${img(shots.hover)}</div>
<div class="row">${img(shots.phone, "phone")}${img(thumb, "thumb")}${share || ""}</div>`;
}

/** Every variant in a row: what repeats across all of them is house style. */
function variants(all) {
  const img = (s, w) => s ? `<img style="width:${w}px" src="data:image/png;base64,${s.png}">` : `<div style="width:${w}px"></div>`;
  return `<!doctype html><meta charset="utf-8"><style>
  body { margin: 0; padding: 16px; width: 1400px; box-sizing: border-box; background: #ececef; color: #18181b; font: 13px/1.3 ui-monospace, Menlo, Consolas, monospace; }
  h1 { font: inherit; margin: 0 0 12px; color: #55555c; }
  .row { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 20px; }
  .name { flex: 0 0 120px; overflow-wrap: anywhere; } img { display: block; outline: 1px solid #c9c9ce; }
</style><h1>variants · look for ground, palette, type family, header, CTA pair, margins or a motif that every row shares</h1>
${all.map(({ name, shots }) => `<div class="row"><div class="name">${esc(name)}</div>${img(shots.desktop, 520)}${img(shots.dark, 520)}${img(shots.phone, 160)}</div>`).join("\n")}`;
}

async function render(browser, html, path, width) {
  const context = await browser.newContext({ viewport: { width, height: 800 } });
  const page = await context.newPage();
  await page.setContent(html);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
  await page.screenshot({ path, fullPage: true });
  await context.close();
}

/** The look of one page. Prints as it goes and returns { failed, shots }. */
async function lookOne(browser, { url, name }, { hover, wait, out, many, component = false }) {
  const say = (line) => console.log(many ? `${name}  ${line}` : line);
  const desktop = { viewport: DESKTOP, colorScheme: "light" };
  const phone = { viewport: PHONE, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: "light" };
  const plan = {
    desktop: [desktop],
    dark: [{ ...desktop, colorScheme: "dark" }],
    first: [desktop, { early: true }],
    reduced: [{ ...desktop, reducedMotion: "reduce" }],
    "no-js": [{ ...desktop, javaScriptEnabled: false }],
    ...(hover ? { hover: [desktop] } : {}),
    phone: [phone],
  };
  const opened = Object.fromEntries(await Promise.all(Object.entries(plan).map(async ([shot, [options, how]]) => [shot, await open(browser, url, options, { wait, ...how })])));

  let failed = false;
  const fail = (line) => { failed = true; say(line); };
  const shots = {};
  const loadFailed = Object.entries(opened).filter(([, o]) => o.failed);
  if (loadFailed.length) {
    fail(`load: fail. ${loadFailed[0][1].bad.at(-1)}`);
    for (const o of Object.values(opened)) await o.context.close();
    return { failed, shots };
  }

  // the measurements, before anything scrolls or hovers
  const d = await opened.desktop.page.evaluate(DESKTOP_CHECKS);
  const p = await opened.phone.page.evaluate(PHONE_CHECKS);
  const lowLight = await opened.desktop.page.evaluate(CONTRAST);
  const lowDark = await opened.dark.page.evaluate(CONTRAST);
  const m = await opened.reduced.page.evaluate(MOTION);

  if (hover) {
    try { await opened.hover.page.hover(hover, { timeout: 3000 }); await sleep(700); } catch { say(`hover: warn. Nothing matches ${hover}, or it can't be hovered; the hover shot is the plain desktop.`); }
  }
  const notes = { first: "  DOMContentLoaded: before fonts, load and entrance animations", reduced: "  prefers-reduced-motion: reduce", "no-js": "  JavaScript off", hover: hover ? `  pointer on ${hover}` : "" };
  for (const [shot, o] of Object.entries(opened)) {
    shots[shot] = { label: `${shot}${notes[shot] ?? ""}`, png: b64(await o.page.screenshot()) };
  }
  const pages = [await fullPage(opened.desktop.page, join(out, `${name}-page.png`)), await fullPage(opened.phone.page, join(out, `${name}-phone-page.png`))];
  const cardImg = d.meta["og:image"] ? await card(opened.desktop.context, d.meta["og:image"]) : null;

  const sheetPath = join(out, `${name}-look.png`);
  await render(browser, sheet(name, url, shots, cardImg), sheetPath, 1800);

  // each complaint once, with the shots that made it
  const noise = new Map();
  for (const [shot, o] of Object.entries(opened)) for (const b of o.bad) noise.set(b, [...(noise.get(b) ?? []), shot]);
  const heard = [...noise].map(([b, where]) => `${b} (${where.length === Object.keys(opened).length ? "every shot" : where.join(", ")})`);
  if (heard.length) fail(`console: fail. ${heard.slice(0, 4).join("; ")}${heard.length > 4 ? `; and ${heard.length - 4} more` : ""}.`);
  else say("console: ok. No console error or warning and no page error, in any shot.");

  if (p.sw > p.W + 1) fail(`overflow: fail. At ${PHONE.width}px the page is ${p.sw}px wide and scrolls sideways. Sticking out: ${p.outer.join("; ") || "nothing found outside a clipping parent; look for negative margins or 100vw"}.`);
  else say(`overflow: ok. Nothing scrolls sideways at ${PHONE.width}px.`);

  say(p.small.length ? `targets: warn. ${p.small.length} control${p.small.length > 1 ? "s" : ""} under ${TARGET}px at phone width: ${p.small.slice(0, 5).join("; ")}${p.small.length > 5 ? "; …" : ""}.` : `targets: ok. Every control is at least ${TARGET}px at phone width.`);

  const low = [...lowLight.map((s) => `light ${s}`), ...lowDark.map((s) => `dark ${s}`)];
  say(low.length ? `contrast: warn. ${low.length} text element${low.length > 1 ? "s" : ""} under the minimum against a solid ground: ${low.slice(0, 4).join("; ")}${low.length > 4 ? "; …" : ""}. Confirm on the sheet.` : "contrast: ok against solid grounds, light and dark. Text over images and gradients is for eyes.");

  say(d.noAlt.length ? `alt: warn. ${d.noAlt.length} <img> without alt: ${d.noAlt.slice(0, 4).join("; ")}.` : "alt: ok. Every <img> has an alt attribute.");

  say(m.forever || m.videos ? `motion: warn. Under reduced motion ${[m.forever && `${m.forever} animation${m.forever > 1 ? "s" : ""} still run forever`, m.videos && `${m.videos} video${m.videos > 1 ? "s" : ""} play`].filter(Boolean).join(" and ")}.` : "motion: ok. Nothing loops or plays under reduced motion.");

  const missing = Object.entries(d.meta).filter(([, v]) => !v).map(([k]) => k);
  if (component) say("share: skipped (--component).");
  else say(missing.length ? `share: warn. Missing ${missing.join(", ")}.${d.meta["og:image"] && !cardImg ? " The og:image could not be loaded." : ""}` : `share: ok. Title, description, card, icons and theme color are set${cardImg ? "; the card is on the sheet" : ", but the og:image could not be loaded"}.`);

  // file:// reports no sizes, so read them from disk
  const size = (f) => f.size || (f.name.startsWith("file:") ? (() => { try { return statSync(fileURLToPath(f.name.split(/[?#]/)[0])).size; } catch { return 0; } })() : 0);
  const total = d.files.reduce((n, f) => n + size(f), 0), js = d.files.filter((f) => f.js).reduce((n, f) => n + size(f), 0) + d.inlineJs;
  const over = [total > BUDGET.total && `total over ${kb(BUDGET.total)}`, js > BUDGET.js && `JavaScript over ${kb(BUDGET.js)}`].filter(Boolean);
  say(`weight: ${over.length ? "warn" : "ok"}. ${kb(total)} in ${d.files.length} file${d.files.length > 1 ? "s" : ""}, ${kb(js)} of it JavaScript${over.length ? `: ${over.join(", ")}` : ""}. Bytes as stored, before compression on file://.`);

  const lcpLine = d.lcp ? `${Math.round(d.lcp.t)}ms on ${d.lcp.el}` : "not reported";
  const slow = d.lcp && d.lcp.t > BUDGET.lcp, shifty = d.cls !== null && d.cls > BUDGET.cls;
  say(`lcp/cls: ${slow || shifty ? "warn" : "ok"}. LCP ${lcpLine}; CLS ${d.cls === null ? "not reported" : d.cls.toFixed(3)}. Local and unthrottled: a real phone on a real network is slower.`);

  say(`sheet ${sheetPath}`);
  say(`full page ${pages.join(", ")}`);
  for (const o of Object.values(opened)) await o.context.close();
  return { failed, shots };
}

export async function look(inputs, { hover = null, wait = 1500, out = process.cwd(), component = false } = {}) {
  const taken = new Set(), targets = [];
  for (const s of inputs) {
    const t = target(s, taken);
    if (!t) { console.error(`look: cannot find ${s}`); return 2; }
    targets.push(t);
  }
  mkdirSync(out, { recursive: true });

  const dir = cacheDir();
  let pw;
  try { pw = playwright(dir); } catch (e) {
    console.error(`look: could not install playwright-core into ${dir}: ${e.message}`);
    console.error("Check the network and run this again, or look with the browser pane or a manual screenshot at desktop and phone width.");
    return 2;
  }
  const browser = await launch(pw.chromium);
  if (!browser) {
    console.error(`look: no Chrome, no other Chromium browser, and no Chromium of Playwright's. Install one once:\n  node "${pw.cli}" install chromium-headless-shell`);
    return 2;
  }

  try {
    let failed = false;
    const all = [];
    for (const t of targets) {
      const r = await lookOne(browser, t, { hover, wait, out, many: targets.length > 1, component });
      failed ||= r.failed;
      all.push({ name: t.name, shots: r.shots });
    }
    if (targets.length > 1) {
      const path = join(out, "look-variants.png");
      await render(browser, variants(all), path, 1400);
      console.log(`variants ${path}`);
    }
    return failed ? 1 : 0;
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.endsWith("look.mjs")) {
  let args;
  try {
    args = parseArgs({ allowPositionals: true, options: { hover: { type: "string" }, wait: { type: "string" }, out: { type: "string" }, component: { type: "boolean", default: false } } });
  } catch (e) {
    console.error(`${e.message}\n${USAGE}`);
    process.exit(2);
  }
  const { positionals, values } = args;
  const wait = values.wait === undefined ? 1500 : Number(values.wait);
  if (!positionals.length || !Number.isFinite(wait) || wait < 0) {
    console.error(USAGE);
    process.exit(2);
  }
  process.exit(await look(positionals, { hover: values.hover ?? null, wait, out: resolve(values.out ?? process.cwd()), component: values.component }));
}
